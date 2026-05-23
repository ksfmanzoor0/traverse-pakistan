import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getAllTours, getTourBySlug } from "@/services/tour.service";
import { BookingSuccessClient } from "@/components/tours/BookingSuccessClient";
import { stampBookingWithUser } from "@/lib/auth/stampBookingWithUser";
import { mintLoginTokenForBooking } from "@/lib/auth/mintLoginToken";
import { sendBookingConfirmation } from "@/lib/email/sendBookingConfirmation";
import { AutoSignIn } from "@/components/auth/AutoSignIn";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateStaticParams() {
  const tours = await getAllTours();
  return tours.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  return { title: tour ? `Booking received — ${tour.name}` : "Booking received" };
}

export default async function BookingSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const tour = await getTourBySlug(slug);
  if (!tour) notFound();

  let tokenHash: string | null = null;
  if (ref) {
    await stampBookingWithUser(ref);
    tokenHash = await mintLoginTokenForBooking(ref);
    sendBookingConfirmation(ref).catch((err) =>
      console.error("[grouptour/success] sendBookingConfirmation failed:", err)
    );
  }

  return (
    <div className="py-10 sm:py-16">
      <AutoSignIn token={tokenHash} />
      <Container>
        <Breadcrumb
          items={[
            { label: "Group Tours", href: "/grouptours" },
            { label: tour.name, href: `/grouptours/${tour.slug}` },
            { label: "Booking received" },
          ]}
        />
        <BookingSuccessClient tour={tour} />
      </Container>
    </div>
  );
}
