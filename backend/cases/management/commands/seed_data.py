"""
Management command: python manage.py seed_data
Populates the database with realistic Kenyan court data for development and demo.
Idempotent — safe to run multiple times (uses get_or_create throughout).
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the database with realistic demo data for the Kenya Court Case Tracker."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding Kenya Court Case Tracker..."))
        self._seed_courts()
        self._seed_users()
        self._seed_products()
        self._seed_cases()
        self.stdout.write(self.style.SUCCESS("✓ Seed complete. See .env.example for demo credentials."))

    def _seed_courts(self):
        from cases.models import Court
        courts_data = [
            {"name": "Nairobi High Court",         "station": "Nairobi",  "county": "Nairobi",   "level": "HIGH"},
            {"name": "Mombasa High Court",          "station": "Mombasa",  "county": "Mombasa",   "level": "HIGH"},
            {"name": "Kisumu High Court",           "station": "Kisumu",   "county": "Kisumu",    "level": "HIGH"},
            {"name": "Nakuru High Court",           "station": "Nakuru",   "county": "Nakuru",    "level": "HIGH"},
            {"name": "Nairobi Magistrate Court",    "station": "Milimani", "county": "Nairobi",   "level": "MAGISTRATE"},
            {"name": "Mombasa Magistrate Court",    "station": "Mombasa",  "county": "Mombasa",   "level": "MAGISTRATE"},
            {"name": "Court of Appeal Nairobi",     "station": "Nairobi",  "county": "Nairobi",   "level": "APPEAL"},
            {"name": "Environment & Land Court Nairobi","station":"Nairobi","county":"Nairobi",    "level": "ENVIRONMENT"},
            {"name": "Employment & Labour Court Nairobi","station":"Nairobi","county":"Nairobi",  "level": "EMPLOYMENT"},
        ]
        for data in courts_data:
            Court.objects.get_or_create(name=data["name"], defaults=data)
        self.stdout.write(f"  ✓ {len(courts_data)} courts seeded")

    def _seed_users(self):
        users = [
            {"email": "admin@courttracker.co.ke",   "full_name": "System Admin",       "role": "SYS_ADMIN",   "password": "Admin@1234"},
            {"email": "clerk@nairobi.courts.go.ke", "full_name": "Mary Wanjiku",        "role": "COURT_ADMIN", "password": "Clerk@1234"},
            {"email": "kamau@advocateslaw.co.ke",   "full_name": "James Kamau",         "role": "ADVOCATE",    "password": "Advocate@1234", "phone": "254712345678"},
            {"email": "citizen@gmail.com",          "full_name": "Grace Akinyi",        "role": "PUBLIC",      "password": "Public@1234", "phone": "254723456789"},
        ]
        for data in users:
            password = data.pop("password")
            user, created = User.objects.get_or_create(email=data["email"], defaults=data)
            if created:
                user.set_password(password)
                user.save()
        self.stdout.write(f"  ✓ {len(users)} users seeded")
        self.stdout.write("    admin@courttracker.co.ke / Admin@1234")
        self.stdout.write("    clerk@nairobi.courts.go.ke / Clerk@1234")
        self.stdout.write("    kamau@advocateslaw.co.ke / Advocate@1234")
        self.stdout.write("    citizen@gmail.com / Public@1234")

    def _seed_products(self):
        from billing.models import Product
        products = [
            {"name": "Free Plan",          "price": 0,    "billing_type": "SUBSCRIPTION", "duration_days": None,  "description": "Basic case search — 1 tracked case."},
            {"name": "Premium Monthly",    "price": 500,  "billing_type": "SUBSCRIPTION", "duration_days": 30,    "description": "Unlimited tracking, SMS/Email alerts, premium documents."},
            {"name": "Premium Annual",     "price": 4800, "billing_type": "SUBSCRIPTION", "duration_days": 365,   "description": "All premium features. 20% savings vs monthly."},
            {"name": "Single Case Report", "price": 150,  "billing_type": "ONE_TIME",     "duration_days": None,  "description": "One-time PDF report for a single case."},
        ]
        for data in products:
            Product.objects.get_or_create(name=data["name"], defaults=data)
        self.stdout.write(f"  ✓ {len(products)} products seeded")

    def _seed_cases(self):
        from cases.models import Court, Case, CaseParty, CaseAdvocate, CaseEvent

        nairobi_hc = Court.objects.get(name="Nairobi High Court")
        mombasa_hc = Court.objects.get(name="Mombasa High Court")
        nairobi_mc = Court.objects.get(name="Nairobi Magistrate Court")
        elc        = Court.objects.get(name="Environment & Land Court Nairobi")

        today = date.today()
        cases_data = [
            {
                "case_number": "HCCC E001/2025", "case_type": "Civil",    "court": nairobi_hc,
                "judge_name": "Hon. Justice J. Ngugi", "status": "HEARING",
                "next_mention_date": today + timedelta(days=7),
                "next_hearing_date": today + timedelta(days=14),
                "public_summary": "Commercial dispute over breach of contract — supply of construction materials.",
                "parties": [
                    {"party_name": "Kamau & Sons Ltd",     "party_role": "PLAINTIFF"},
                    {"party_name": "BuildRight Kenya Ltd", "party_role": "DEFENDANT"},
                ],
                "advocates": [
                    {"advocate_name": "James Kamau",     "law_firm": "Kamau Advocates"},
                    {"advocate_name": "Sarah Otieno",    "law_firm": "Otieno & Partners"},
                ],
                "events": [
                    {"event_date": today - timedelta(days=60), "event_type": "FILING",  "notes": "Plaint filed. Summons issued."},
                    {"event_date": today - timedelta(days=30), "event_type": "MENTION", "notes": "Parties present. Defence filed. Next mention set."},
                    {"event_date": today - timedelta(days=7),  "event_type": "HEARING", "notes": "Plaintiff's evidence recorded. Witness 1 cross-examined."},
                ],
            },
            {
                "case_number": "MCCR E045/2025", "case_type": "Criminal", "court": nairobi_mc,
                "judge_name": "Hon. Senior Resident Magistrate A. Mwangi", "status": "MENTION",
                "next_mention_date": today + timedelta(days=3),
                "next_hearing_date": today + timedelta(days=21),
                "public_summary": "Robbery with violence contrary to Section 296(2) of the Penal Code.",
                "parties": [
                    {"party_name": "Republic",        "party_role": "PLAINTIFF"},
                    {"party_name": "John Doe Otieno", "party_role": "ACCUSED"},
                ],
                "advocates": [
                    {"advocate_name": "Peter Waweru",  "law_firm": "Waweru & Co Advocates"},
                ],
                "events": [
                    {"event_date": today - timedelta(days=45), "event_type": "FILING",  "notes": "Charge sheet presented. Accused arraigned. Bail denied."},
                    {"event_date": today - timedelta(days=15), "event_type": "MENTION", "notes": "Prosecution not ready. Mention adjourned."},
                ],
            },
            {
                "case_number": "ELC E012/2024", "case_type": "Land",     "court": elc,
                "judge_name": "Hon. Justice M. Odundo", "status": "RULING",
                "next_mention_date": None,
                "next_hearing_date": None,
                "public_summary": "Dispute over ownership of 5-acre parcel in Kiambu County.",
                "parties": [
                    {"party_name": "Grace Wambui",   "party_role": "PETITIONER"},
                    {"party_name": "David Kariuki",  "party_role": "RESPONDENT"},
                ],
                "advocates": [
                    {"advocate_name": "Anne Njoroge", "law_firm": "Njoroge Legal Associates"},
                    {"advocate_name": "Tom Mugo",     "law_firm": "Mugo & Mugo Advocates"},
                ],
                "events": [
                    {"event_date": today - timedelta(days=180), "event_type": "FILING",  "notes": "Petition filed. Land Board records produced."},
                    {"event_date": today - timedelta(days=90),  "event_type": "HEARING", "notes": "Site visit conducted. Survey report tendered."},
                    {"event_date": today - timedelta(days=14),  "event_type": "RULING",  "notes": "Judgment reserved. Parties to await notification."},
                ],
            },
            {
                "case_number": "HCCC E089/2025", "case_type": "Civil",   "court": mombasa_hc,
                "judge_name": "Hon. Justice F. Tuiyott", "status": "FILED",
                "next_mention_date": today + timedelta(days=21),
                "next_hearing_date": None,
                "public_summary": "Defamation suit arising from social media posts.",
                "parties": [
                    {"party_name": "Ali Mohamed Hassan",   "party_role": "PLAINTIFF"},
                    {"party_name": "Coastal Media Ltd",    "party_role": "DEFENDANT"},
                ],
                "advocates": [
                    {"advocate_name": "Hassan Abdi",  "law_firm": "Abdi & Rashid Advocates"},
                ],
                "events": [
                    {"event_date": today - timedelta(days=10), "event_type": "FILING", "notes": "Plaint filed. Defendant to be served."},
                ],
            },
        ]

        clerk = User.objects.filter(role="COURT_ADMIN").first()
        created_count = 0

        for data in cases_data:
            parties_data   = data.pop("parties")
            advocates_data = data.pop("advocates")
            events_data    = data.pop("events")

            case, created = Case.objects.get_or_create(
                case_number=data["case_number"], defaults=data
            )
            if created:
                created_count += 1
                for p in parties_data:
                    CaseParty.objects.get_or_create(case=case, **p)
                for a in advocates_data:
                    CaseAdvocate.objects.get_or_create(case=case, **a)
                for e in events_data:
                    CaseEvent.objects.get_or_create(case=case, created_by=clerk, **e)

        self.stdout.write(f"  ✓ {created_count} cases seeded with parties, advocates, and events")
