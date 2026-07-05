import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { billingApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import { TextInput } from "../components/FormField";

export default function PricingPage() {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("plans"); // plans | checkout | processing | success
  const [phone, setPhone] = useState(user?.phone || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    billingApi.getProducts().then(({ data }) => setProducts(data));
  }, []);

  const handleSelectPlan = (product) => {
    if (product.price === "0.00" || product.price === 0) return; // Free plan — no checkout needed
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/pricing" } } });
      return;
    }
    setSelected(product);
    setStep("checkout");
    setError("");
  };

  const handlePay = async (method) => {
    setError("");
    setLoading(true);
    try {
      const { data: createdOrder } = await billingApi.createOrder(selected.id, method);
      setOrder(createdOrder);

      if (method === "MOCK") {
        await billingApi.confirmMock(createdOrder.id);
        await refreshUser();
        setStep("success");
      } else {
        await billingApi.initiateSTKPush(createdOrder.id, phone);
        setStep("processing");
        pollSubscription();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment could not be started. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pollSubscription = () => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const { data } = await billingApi.getSubscription();
      if (data.active) {
        clearInterval(interval);
        await refreshUser();
        setStep("success");
      } else if (attempts >= 20) {
        clearInterval(interval);
        setError("We didn't receive payment confirmation. If you completed the M-Pesa prompt, your subscription will activate shortly.");
        setStep("checkout");
      }
    }, 3000);
  };

  if (step === "checkout" && selected) {
    return (
      <CheckoutStep
        product={selected}
        phone={phone}
        setPhone={setPhone}
        onPay={handlePay}
        onBack={() => setStep("plans")}
        loading={loading}
        error={error}
      />
    );
  }

  if (step === "processing") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <Spinner size={36} className="text-[var(--color-ink)]" />
        <h2 className="mt-6 font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
          Check your phone
        </h2>
        <p className="mt-2 text-sm text-[var(--color-slate)]">
          An M-Pesa prompt has been sent to {phone}. Enter your PIN to complete the payment.
        </p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-ledger-bg)] text-[var(--color-ledger)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-6 font-[var(--font-display)] text-xl font-semibold text-[var(--color-ink)]">
          Subscription active
        </h2>
        <p className="mt-2 text-sm text-[var(--color-slate)]">
          You now have unlimited case tracking, notifications, and premium document access.
        </p>
        <Button className="mt-6" onClick={() => navigate("/dashboard")}>Go to my dashboard</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-[var(--font-display)] text-3xl font-semibold text-[var(--color-ink)]">
          Choose your plan
        </h1>
        <p className="mt-2 text-[var(--color-slate)]">All prices in Kenyan Shillings.</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {products.map((p) => (
          <PlanCard key={p.id} product={p} onSelect={() => handleSelectPlan(p)} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ product, onSelect }) {
  const isFree = Number(product.price) === 0;
  const isPopular = product.name === "Premium Monthly";

  return (
    <div className={`flex flex-col rounded-sm p-6 ${isPopular ? "bg-[var(--color-ink)] text-white shadow-lg" : "border border-[var(--color-slate-light)]/30 bg-white"}`}>
      {isPopular && (
        <span className="tab-badge mb-3 self-start bg-[var(--color-brass)] text-[var(--color-ink)]">Most popular</span>
      )}
      <h3 className={`font-[var(--font-display)] text-lg font-semibold ${isPopular ? "text-white" : "text-[var(--color-ink)]"}`}>
        {product.name}
      </h3>
      <p className="mt-1">
        <span className="text-2xl font-semibold">KES {Number(product.price).toLocaleString()}</span>
        {product.duration_days && (
          <span className={isPopular ? "text-white/60" : "text-[var(--color-slate)]"}>
            {" "}/ {product.duration_days >= 365 ? "year" : "month"}
          </span>
        )}
      </p>
      <p className={`mt-2 text-sm ${isPopular ? "text-white/75" : "text-[var(--color-slate)]"}`}>
        {product.description}
      </p>
      <Button
        variant={isPopular ? "brass" : isFree ? "outline" : "primary"}
        className="mt-6"
        onClick={onSelect}
        disabled={isFree}
      >
        {isFree ? "Included free" : "Choose plan"}
      </Button>
    </div>
  );
}

function CheckoutStep({ product, phone, setPhone, onPay, onBack, loading, error }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <button onClick={onBack} className="text-sm font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)]">
        ← Back to plans
      </button>

      <h1 className="mt-4 font-[var(--font-display)] text-2xl font-semibold text-[var(--color-ink)]">
        Checkout
      </h1>

      <div className="mt-6 rounded-sm border border-[var(--color-slate-light)]/30 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[var(--color-ink)]">{product.name}</span>
          <span className="font-semibold text-[var(--color-ink)]">KES {Number(product.price).toLocaleString()}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-slate)]">{product.description}</p>
      </div>

      {error && (
        <div className="mt-4 rounded-sm bg-[var(--color-brick-bg)] px-4 py-3 text-sm text-[var(--color-brick)]">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <label className="block text-sm font-medium text-[var(--color-ink)]">M-Pesa phone number</label>
        <TextInput
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="254712345678"
        />
        <Button variant="brass" className="w-full" onClick={() => onPay("MPESA")} disabled={loading || !phone}>
          {loading ? "Processing…" : "Pay with M-Pesa"}
        </Button>

        <div className="relative py-2 text-center text-xs text-[var(--color-slate-light)]">
          <span className="relative bg-white px-2">or, for demo purposes</span>
          <div className="absolute left-0 top-1/2 -z-10 h-px w-full bg-[var(--color-slate-light)]/30" />
        </div>

        <Button variant="outline" className="w-full" onClick={() => onPay("MOCK")} disabled={loading}>
          {loading ? "Processing…" : "Pay with Mock (Demo)"}
        </Button>
      </div>
    </div>
  );
}
