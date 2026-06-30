"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { updateVehicleType, updateEngineConfig } from "@/services/vehicle.service";
import { repriceAllPackages } from "@/services/package-quote.service";

/**
 * Vehicle and engine-config changes are engine inputs — they feed every
 * package's transport cost / margin / fuel math. After persisting the edit
 * we run the full reprice so:
 *   - packages.pricing snapshot reflects the new numbers (listings, cards,
 *     SEO, sidebar first-paint stay accurate)
 *   - both cache tags get busted so visitors don't see a stale render
 *
 * The reprice runs sequentially-batched (5 packages at a time) and finishes
 * in roughly 10-20 seconds; the admin save click waits for it so the success
 * state is honest about when everything is in sync.
 */
async function repriceAndRevalidate() {
  try {
    await repriceAllPackages();
  } catch (err) {
    // Failure here doesn't undo the underlying vehicle/engine-config write.
    // Surface it to the server log; the next cron run will catch up.
    console.error("[admin] repriceAllPackages failed", err);
  }
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/cost-calculator");
}

export async function saveVehicleAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("vehicle id is required");

  const num = (key: string) => {
    const v = formData.get(key);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  await updateVehicleType({
    id,
    kmPerLitre: num("kmPerLitre"),
    maxPeople: num("maxPeople"),
    rentPerDay: num("rentPerDay"),
    displayName: str("displayName"),
  });

  await repriceAndRevalidate();
}

export async function saveEngineConfigAction(formData: FormData) {
  await requireAdmin();

  const num = (key: string) => {
    const v = formData.get(key);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  await updateEngineConfig({
    fuelPricePerLitre: num("fuelPricePerLitre"),
    profitPercentage: num("profitPercentage"),
    packageBufferKm: num("packageBufferKm"),
    lheExtensionKm: num("lheExtensionKm"),
    guidePerDay: num("guidePerDay"),
  });

  await repriceAndRevalidate();
}
