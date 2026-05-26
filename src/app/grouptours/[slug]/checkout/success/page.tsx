import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getAllTours, getTourBySlug } from "@/services/tour.service";
import { BookingSuccessClient } from "@/components/tours/BookingSuccessClient";
import { stampBookingWithUser } from "@/lib/auth/stampBookingWithUser";
import { sendBookingConfirmation } from "@/lib/email/sendBookingConfirmation";

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

  if (ref) {
    await stampBookingWithUser(ref);
    sendBookingConfirmation(ref).catch((err) =>
      console.error("[grouptour/success] sendBookingConfirmation failed:", err)
    );
  }

  return (
    <div className="py-10 sm:py-16">
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
