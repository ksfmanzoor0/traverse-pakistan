"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { updateVehicleType, updateEngineConfig } from "@/services/vehicle.service";

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

  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/cost-calculator");
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

  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/cost-calculator");
}
