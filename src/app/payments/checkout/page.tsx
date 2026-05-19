"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getWhatsAppUrl } from "@/lib/utils";

declare global {
  interface Window {
    InitializeValues: (storeId: string, transType: string, orderId: string, amount: string, secretKey: string) => void;
    successCallback: () => void;
    failedCallback: () => void;
  }
}

function bookingMeta(ref: string) {
  if (ref.startsWith("PKG-")) return { label: "package", browseHref: "/packages", browseLabel: "Browse more packages" };
  if (ref.startsWith("HTL-")) return { label: "hotel", browseHref: "/hotels", browseLabel: "Browse more hotels" };
  return { label: "tour", browseHref: "/grouptours", browseLabel: "Browse more tours" };
}

type State = "loading" | "ready" | "paid" | "failed" | "error";

function CheckoutInner() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") ?? "";

  const [state, setState] = useState<State>("loading");
  const [amount, setAmount] = useState<string | null>(null);
  const [initParams, setInitParams] = useState<{ storeId: string; transType: string; orderId: string; amount: string; secretKey: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scriptReady = useRef(false);

  const { label, browseHref, browseLabel } = bookingMeta(ref);

  useEffect(() => {
    if (!ref) {
      setState("error");
      setErrorMsg("No booking reference found.");
      return;
    }

    fetch(`/api/payments/alfa/initiate-hosted?ref=${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAmount(data.amount);
        setInitParams(data);
        setState("ready");
      })
      .catch((e) => {
        setErrorMsg(e.message);
        setState("error");
      });
  }, [ref]);

  // Load jQuery then Alfa script only after form is in DOM (state === "ready")
  // Alfa's script binds #InitiateTrans click handler in $(document).ready —
  // if it loads before the form renders, the binding silently fails
  useEffect(() => {
    if (state !== "ready" || !initParams || scriptReady.current) return;

    function loadScript(src: string, onload: () => void) {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = onload;
      document.head.appendChild(s);
    }

    loadScript("https://code.jquery.com/jquery-3.7.1.min.js", () => {
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js", () => {
        loadScript(
          "https://merchants.bankalfalah.com/merchantportalprelive/HostedCheckoutFiles/HostedCheckoutPayments.js",
          () => {
            scriptReady.current = true;
            initializeCheckout(initParams);
          }
        );
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, initParams]);

  function initializeCheckout(params: typeof initParams) {
    if (!params || !window.InitializeValues) return;
    window.successCallback = () => setState("paid");
    window.failedCallback = () => setState("failed");
    window.InitializeValues(params.storeId, params.transType, params.orderId, params.amount, params.secretKey);
  }

  if (state === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--error)]/10 flex items-center justify-center">
            <Icon name="x" size="lg" className="text-[var(--error)]" />
          </div>
          <p className="text-[20px] font-bold text-[var(--text-primary)]">Could not load payment</p>
          <p className="text-[14px] text-[var(--text-secondary)]">{errorMsg ?? "Please contact us to complete your booking."}</p>
          <a
            href={getWhatsAppUrl(`Hi, I'm trying to pay for ${label} booking ${ref} but the payment page didn't load. Can you help?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 px-6 items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Contact us on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (state === "paid") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--success)]/10 flex items-center justify-center">
            <Icon name="check" size="lg" className="text-[var(--success)]" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-[var(--text-primary)]">Payment confirmed</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              Your {label} booking is confirmed. We&apos;ll send details to your email shortly.
            </p>
          </div>
          <div className="p-4 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] text-left space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-tertiary)]">Booking ref</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">{ref}</span>
            </div>
            {amount && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-tertiary)]">Amount paid</span>
                <span className="font-semibold text-[var(--text-primary)]">PKR {Number(amount).toLocaleString()}</span>
              </div>
            )}
          </div>
          <Link
            href={browseHref}
            className="inline-flex h-11 px-6 items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            {browseLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--warning)]/10 flex items-center justify-center">
            <Icon name="x" size="lg" className="text-[var(--warning)]" />
          </div>
          <p className="text-[20px] font-bold text-[var(--text-primary)]">Payment not completed</p>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Booking <span className="font-mono font-semibold">{ref}</span> was not paid. Please try again or contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setState("ready"); if (initParams) initializeCheckout(initParams); }}
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Try again
            </button>
            <a
              href={getWhatsAppUrl(`Hi, I tried to pay for ${label} booking ${ref} but the payment didn't go through. Can you help?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              Contact us
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[60vh] py-10 px-4">
        <div className="max-w-md mx-auto space-y-6">
          {state === "loading" && (
            <div className="flex items-center justify-center py-20">
              <p className="text-[var(--text-secondary)] text-[15px]">Loading payment form…</p>
            </div>
          )}

          {state === "ready" && (
            <>
              <div className="text-center space-y-1">
                <p className="text-[20px] font-bold text-[var(--text-primary)]">Complete your payment</p>
                <p className="text-[13px] font-mono text-[var(--text-tertiary)]">{ref}</p>
                {amount && (
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                    PKR {Number(amount).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="p-5 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-md)] space-y-4">
                <form id="TransactionForm" className="space-y-3">
                  <input className="CardNumber allow_numeric w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="CardNumber" name="TransCardNumber" type="text" placeholder="Card number" />
                  <div className="grid grid-cols-3 gap-3">
                    <input className="CVV allow_numeric w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="CVV" name="TransCVV" type="text" placeholder="CVV" />
                    <input className="ExpiryMonth allow_numeric w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="ExpiryMonth" name="TransExpiryMonth" type="text" placeholder="MM" />
                    <input className="ExpiryYear allow_numeric w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="ExpiryYear" name="TransExpiryYear" type="text" placeholder="YYYY" />
                  </div>
                  <input className="CustomerName allow_alphabet w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="CustomerName" name="TransCustomerName" type="text" placeholder="Cardholder name" />
                  <input className="CustomerEmailAddress w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="CustomerEmailAddress" name="TransCustomerEmailAddress" type="email" placeholder="Email address" />
                  <input className="CustomerMobileNumber w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)]" id="CustomerMobileNumber" name="TransCustomerMobileNumber" type="tel" placeholder="+923331234567" />

                  {/* Alfa requires these elements — shown/hidden by its script */}
                  <div id="dvFailed" style={{ display: "none" }} className="p-3 bg-[var(--error)]/10 rounded-[var(--radius-sm)] text-center">
                    <p id="failedMsg" className="text-[13px] text-[var(--error)] font-medium" />
                  </div>
                  <div id="dvSuccess" style={{ display: "none" }} />

                  {/* Hidden initially — Alfa's FetchKeys success shows it once encryption keys are ready */}
                  <button
                    type="button"
                    id="InitiateTrans"
                    name="TransInitiateTrans"
                    style={{ display: "none" }}
                    className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
                  >
                    Pay PKR {amount ? Number(amount).toLocaleString() : ""}
                  </button>
                  <label className="errorlbl block text-[12px] text-[var(--error)] text-center" id="errorlbl" />
                </form>
                <div id="dv3DS" />
              </div>

              <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                Secured by Bank Alfalah
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p className="text-[var(--text-secondary)] text-[15px]">Loading…</p></div>}>
      <CheckoutInner />
    </Suspense>
  );
}
