import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { InvitationLetterForm } from "@/components/invitation/InvitationLetterForm";
import {
  getInvitationLetterPricePkr,
  INVITATION_LETTER_PRICE_USD,
} from "@/lib/invitation/config";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Pakistan Visa Invitation Letter — Traverse Pakistan",
  description:
    "Request an official invitation letter for your Pakistan tourist visa. Signed by Traverse Pakistan (DTS Licence 2493). Delivered within 2–3 business days.",
  path: "/invitation-letter",
  tags: ["Pakistan invitation letter", "tourist visa Pakistan", "visa support letter"],
});

export default async function InvitationLetterPage() {
  const pricePkr = await getInvitationLetterPricePkr();
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Invitation Letter" }]} />
        <div className="mt-6 mb-10 max-w-3xl">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Pakistan Visa Invitation Letter
          </h1>
          <p className="text-[17px] text-[var(--text-secondary)] mt-3 leading-relaxed">
            An official letter addressed to your embassy, signed by Traverse Pakistan
            (SECP #0137385, DTS Licence 2493), confirming your itinerary and our
            support during your trip. Delivered by email within 2–3 business days
            of payment.
          </p>
        </div>

        <InvitationLetterForm
          priceUsd={INVITATION_LETTER_PRICE_USD}
          pricePkr={pricePkr}
        />
      </Container>
    </div>
  );
}
