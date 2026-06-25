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
