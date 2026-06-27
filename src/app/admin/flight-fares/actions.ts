"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import {
  upsertManualOverride,
  deleteManualOverride,
  updateScraperConfig,
  type ManualOverridePayload,
} from "@/services/flight-fares.service";
import { repriceAllPackages } from "@/services/package-quote.service";

/**
 * Flight manual overrides are engine inputs — the resolver in addon-cost
 * picks them over scraped fares with no delay. Without a reprice the engine
 * snapshot in packages.pricing keeps the old value for up to 24h, and the
 * sidebar's package-quote cache holds it for up to 1h. Mirroring the
 * vehicle / engine-config action pattern: full reprice + tag bust after
 * the override write succeeds. Scraper-config saves don't fire a reprice
 * because they don't directly mutate flight_routes — that's the scraper's
 * job on its own schedule.
 */
async function repriceAndRevalidate() {
  try {
    await repriceAllPackages();
  } catch (err) {
    console.error("[admin/flight-fares] repriceAllPackages failed", err);
  }
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});
  revalidatePath("/admin/flight-fares");
}

type ActionResult = { ok: true } | { ok: false; error: string };

function parseFare(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function trimOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export async function saveManualOverride(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const origin = trimOrNull(formData.get("origin"))?.toUpperCase();
  const destination = trimOrNull(formData.get("destination"))?.toUpperCase();
  const airline = trimOrNull(formData.get("airline"));
  const routeType = formData.get("routeType") === "RETURN" ? "RETURN" : "ONEWAY";
  const departDate = trimOrNull(formData.get("departDate"));
  const returnDate = trimOrNull(formData.get("returnDate"));
  const fareTotal = parseFare(formData.get("fareTotal"));
  const notes = trimOrNull(formData.get("notes"));

  if (!origin || !destination || !airline || !departDate || fareTotal === null) {
    return {
      ok: false,
      error: "origin, destination, airline, departDate and a positive fareTotal are required",
    };
  }
  if (routeType === "RETURN" && !returnDate) {
    return { ok: false, error: "returnDate is required for RETURN fares" };
  }

  const payload: ManualOverridePayload = {
    origin,
    destination,
    airline,
    routeType,
    departDate,
    returnDate: routeType === "RETURN" ? returnDate : null,
    fareTotal,
    notes,
  };

  try {
    await upsertManualOverride(payload, admin.email ?? null);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  await repriceAndRevalidate();
  return { ok: true };
}

export async function saveScraperConfig(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const email = trimOrNull(formData.get("email"));
  const password = formData.get("password");
  const scrapeEnabledRaw = formData.get("scrapeEnabled");

  if (email === null) {
    return { ok: false, error: "Email is required" };
  }
  if (typeof email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email looks invalid" };
  }

  const passwordStr = typeof password === "string" && password.length > 0 ? password : undefined;

  try {
    await updateScraperConfig(
      {
        email,
        password: passwordStr,
        scrapeEnabled: scrapeEnabledRaw === "on" || scrapeEnabledRaw === "true",
      },
      admin.email ?? null,
    );
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  revalidatePath("/admin/flight-fares");
  return { ok: true };
}

export async function removeManualOverride(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = typeof formData.get("id") === "string" ? (formData.get("id") as string) : null;
  if (!id) return { ok: false, error: "id required" };
  try {
    await deleteManualOverride(id);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  await repriceAndRevalidate();
  return { ok: true };
}
