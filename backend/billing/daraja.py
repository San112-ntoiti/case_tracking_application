"""
M-Pesa Daraja API Service
Handles all communication with the Safaricom Daraja API.
This class is an adapter — business logic in billing/views.py
should never call Requests directly; it calls this service.
That way, if the Daraja API changes, we only update this file.

Safaricom Sandbox Base URL: https://sandbox.safaricom.co.ke
Safaricom Production URL:   https://api.safaricom.co.ke
"""
import base64
import logging
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class DarajaService:
    """Encapsulates all M-Pesa Daraja API interactions."""

    SANDBOX_BASE    = "https://sandbox.safaricom.co.ke"
    PRODUCTION_BASE = "https://api.safaricom.co.ke"

    def __init__(self):
        self.is_sandbox = settings.MPESA_ENVIRONMENT == "sandbox"
        self.base_url   = self.SANDBOX_BASE if self.is_sandbox else self.PRODUCTION_BASE

    # ── Step 1: Get OAuth access token ────────────────────────────────────────
    def get_access_token(self):
        """
        Fetches a short-lived OAuth 2.0 token from Safaricom.
        This token is required on every subsequent Daraja API call.
        In production, this should be cached in Redis with a TTL of 55 minutes.
        """
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        try:
            response = requests.get(
                url,
                auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
                timeout=10,
            )
            response.raise_for_status()
            return response.json().get("access_token")
        except requests.RequestException as e:
            logger.error(f"Daraja OAuth error: {e}")
            raise

    # ── Step 2: Generate password for STK Push ────────────────────────────────
    def _generate_password(self, timestamp):
        """
        The STK Push password is: base64(shortcode + passkey + timestamp).
        This is Safaricom's way of signing the request.
        """
        raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    # ── Step 3: Initiate STK Push ─────────────────────────────────────────────
    def initiate_stk_push(self, phone_number, amount, account_reference, description):
        """
        Sends an STK Push prompt to the user's phone.
        Returns the CheckoutRequestID which we store in Order.provider_reference
        to match against the incoming callback.

        phone_number format: 254712345678 (no + prefix, no leading 0)
        amount: integer (KES, no decimal places in M-Pesa)
        """
        access_token = self.get_access_token()
        timestamp    = datetime.now().strftime("%Y%m%d%H%M%S")
        password     = self._generate_password(timestamp)

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json",
        }
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password":          password,
            "Timestamp":         timestamp,
            "TransactionType":   "CustomerPayBillOnline",
            "Amount":            int(amount),                # M-Pesa requires integer
            "PartyA":            phone_number,
            "PartyB":            settings.MPESA_SHORTCODE,
            "PhoneNumber":       phone_number,
            "CallBackURL":       settings.MPESA_CALLBACK_URL,
            "AccountReference":  account_reference[:12],     # Max 12 chars
            "TransactionDesc":   description[:13],           # Max 13 chars
        }

        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            response.raise_for_status()
            data = response.json()
            logger.info(f"STK Push initiated: {data.get('CheckoutRequestID')}")
            return data
        except requests.RequestException as e:
            logger.error(f"STK Push error: {e}")
            raise

    # ── Step 4: Parse callback ────────────────────────────────────────────────
    @staticmethod
    def parse_callback(callback_data):
        """
        Extracts result code and reference from Safaricom's callback body.
        ResultCode 0 = success; anything else = failure.
        Returns: (success: bool, checkout_request_id: str, metadata: dict)
        """
        try:
            stk_callback = callback_data["Body"]["stkCallback"]
            result_code  = stk_callback["ResultCode"]
            checkout_id  = stk_callback["CheckoutRequestID"]
            success      = result_code == 0

            metadata = {}
            if success and "CallbackMetadata" in stk_callback:
                for item in stk_callback["CallbackMetadata"]["Item"]:
                    metadata[item["Name"]] = item.get("Value")

            return success, checkout_id, metadata
        except (KeyError, TypeError) as e:
            logger.error(f"Callback parse error: {e}")
            return False, None, {}
