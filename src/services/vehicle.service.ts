import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface VehicleType {
  id: string;
  code: string;
  displayName: string;
  kmPerLitre: number;
  maxPeople: number;
  rentPerDay: number;
  isNcp: boolean;
  ncpPairCode: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface VehicleTypeRow {
  id: string;
  code: string;
  display_name: string;
  km_per_litre: number;
  max_people: number;
  rent_per_day: number;
  is_ncp: boolean;
  ncp_pair_code: string | null;
  sort_order: number;
  is_active: boolean;
}

function fromRow(r: VehicleTypeRow): VehicleType {
  return {
    id: r.id,
    code: r.code,
    displayName: r.display_name,
    kmPerLitre: Number(r.km_per_litre),
    maxPeople: r.max_people,
    rentPerDay: r.rent_per_day,
    isNcp: r.is_ncp,
    ncpPairCode: r.ncp_pair_code,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  };
}

export async function listVehicleTypes(): Promise<VehicleType[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("vehicle_types")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`listVehicleTypes: ${error.message}`);
  return ((data ?? []) as VehicleTypeRow[]).map(fromRow);
}

export interface VehicleTypeUpdate {
  id: string;
  kmPerLitre?: number;
  maxPeople?: number;
  rentPerDay?: number;
  displayName?: string;
}

export interface EngineConfig {
  fuelPricePerLitre: number;
  profitPercentage: number;
  packageBufferKm: number;
  lheExtensionKm: number;
  guidePerDay: number;
}

export async function getEngineConfig(): Promise<EngineConfig> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("engine_config")
    .select("fuel_price_per_litre, profit_percentage, package_buffer_km, lhe_extension_km, guide_per_day")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(`getEngineConfig: ${error.message}`);
  const row = (data ?? {}) as {
    fuel_price_per_litre?: number;
    profit_percentage?: number;
    package_buffer_km?: number;
    lhe_extension_km?: number;
    guide_per_day?: number;
  };
  return {
    fuelPricePerLitre: row.fuel_price_per_litre ?? 285,
    profitPercentage: row.profit_percentage ?? 20,
    packageBufferKm: row.package_buffer_km ?? 100,
    lheExtensionKm: row.lhe_extension_km ?? 800,
    guidePerDay: row.guide_per_day ?? 5000,
  };
}

export async function updateEngineConfig(update: Partial<EngineConfig>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const patch: Partial<{
    fuel_price_per_litre: number;
    profit_percentage: number;
    package_buffer_km: number;
    lhe_extension_km: number;
    guide_per_day: number;
  }> = {};
  if (update.fuelPricePerLitre !== undefined) patch.fuel_price_per_litre = update.fuelPricePerLitre;
  if (update.profitPercentage !== undefined) patch.profit_percentage = update.profitPercentage;
  if (update.packageBufferKm !== undefined) patch.package_buffer_km = update.packageBufferKm;
  if (update.lheExtensionKm !== undefined) patch.lhe_extension_km = update.lheExtensionKm;
  if (update.guidePerDay !== undefined) patch.guide_per_day = update.guidePerDay;
  const { error } = await supabase.from("engine_config").update(patch).eq("id", "default");
  if (error) throw new Error(`updateEngineConfig: ${error.message}`);
}

export async function updateVehicleType(update: VehicleTypeUpdate): Promise<void> {
  const supabase = getSupabaseAdmin();
  const patch: Partial<{
    km_per_litre: number;
    max_people: number;
    rent_per_day: number;
    display_name: string;
  }> = {};
  if (update.kmPerLitre !== undefined) patch.km_per_litre = update.kmPerLitre;
  if (update.maxPeople !== undefined) patch.max_people = update.maxPeople;
  if (update.rentPerDay !== undefined) patch.rent_per_day = update.rentPerDay;
  if (update.displayName !== undefined) patch.display_name = update.displayName;

  const { error } = await supabase.from("vehicle_types").update(patch).eq("id", update.id);
  if (error) throw new Error(`updateVehicleType: ${error.message}`);
}
