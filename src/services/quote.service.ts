"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CreateQuoteRequestInput } from "@/types/quote";

// NOTE: we deliberately do NOT chain `.select()` here. A returning select
// triggers the RLS SELECT policy on the new row, which is owner-only
// (auth.uid() = user_id). Logged-out visitors (user_id null) can't read their
// own row back, so RETURNING fails with "new row violates row-level security
// policy". Inserting without a representation skips RETURNING entirely; the
// insert WITH CHECK policy still allows it. Callers only need success/failure.
export async function createQuoteRequest(
  input: CreateQuoteRequestInput
): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Quote requests unavailable. Please use WhatsApp.");
  }

  const supabase = getSupabaseBrowser();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? null;

  const { error } = await supabase
    .from("quote_requests")
    .insert({
      user_id: userId,
      request_type: input.requestType,
      slug: input.slug ?? null,
      display_name: input.displayName,
      tier: input.tier ?? null,
      preferred_start_date: input.preferredStartDate ?? null,
      preferred_end_date: input.preferredEndDate ?? null,
      adults: input.adults,
      children: input.children,
      rooms: input.rooms,
      departure_city: input.departureCity ?? null,
      contact_name: input.contact.name,
      contact_email: input.contact.email,
      contact_phone: input.contact.phone,
      notes: input.notes ?? null,
    });

  if (error) throw new Error(error.message);
}
