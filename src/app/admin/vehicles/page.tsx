import { requireAdmin } from "@/lib/admin/guard";
import { listVehicleTypes, getEngineConfig } from "@/services/vehicle.service";
import { saveVehicleAction, saveEngineConfigAction } from "./actions";
import { SaveButton } from "./SaveButton";

export const dynamic = "force-dynamic";

export default async function VehiclesAdminPage() {
  await requireAdmin();
  const [vehicles, config] = await Promise.all([listVehicleTypes(), getEngineConfig()]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Vehicles &amp; Engine Config
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Operator-editable transport types and global engine constants. NCP variants
          (Skardu/Gilgit permit rate) auto-swap when a package&apos;s starting city is KDU or GIL.
          Guide rate is set per-quote on the calculator, profit % too.
        </p>
      </div>

      {/* Engine globals — separate form per field with its own Save button */}
      <section
        className="rounded-lg p-5 space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          Engine config
        </h2>

        <ConfigField
          label="Fuel / litre (PKR)"
          name="fuelPricePerLitre"
          defaultValue={config.fuelPricePerLitre}
        />
        <ConfigField
          label="Package buffer (km)"
          name="packageBufferKm"
          defaultValue={config.packageBufferKm}
        />
        <ConfigField
          label="LHE extension (km)"
          name="lheExtensionKm"
          defaultValue={config.lheExtensionKm}
        />
      </section>

      {/* Vehicles — one form per row using CSS grid (avoids table-cell button clipping) */}
      <section
        className="rounded-lg p-5 space-y-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          Vehicles
        </h2>
        <div
          className="grid gap-2 text-xs px-2 pb-1"
          style={{
            gridTemplateColumns: "200px 90px 90px 110px 60px 1fr",
            color: "var(--text-tertiary)",
          }}
        >
          <div>Vehicle</div>
          <div>km/L</div>
          <div>Max people</div>
          <div>Rent / day</div>
          <div>NCP</div>
          <div></div>
        </div>

        {vehicles.map((v) => (
          <form
            key={v.id}
            action={saveVehicleAction}
            className="grid gap-2 items-center rounded-md p-2"
            style={{
              gridTemplateColumns: "200px 90px 90px 110px 60px 1fr",
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
            }}
          >
            <input type="hidden" name="id" value={v.id} />
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {v.displayName}
              </div>
              <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{v.code}</div>
            </div>
            <input
              type="number"
              name="kmPerLitre"
              step="0.1"
              defaultValue={v.kmPerLitre}
              className="w-full rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
            <input
              type="number"
              name="maxPeople"
              defaultValue={v.maxPeople}
              className="w-full rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
            <input
              type="number"
              name="rentPerDay"
              defaultValue={v.rentPerDay}
              className="w-full rounded px-2 py-1.5 text-sm"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
            <div className="text-xs" style={{ color: v.isNcp ? "var(--accent-warning)" : "var(--text-tertiary)" }}>
              {v.isNcp ? "yes" : "—"}
            </div>
            <div className="flex justify-end">
              <SaveButton />
            </div>
          </form>
        ))}
      </section>
    </div>
  );
}

function ConfigField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <form
      action={saveEngineConfigAction}
      className="grid gap-3 items-end"
      style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
    >
      <label className="block text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <input
          type="number"
          name={name}
          defaultValue={defaultValue}
          className="mt-1 w-full rounded px-2 py-2 text-sm"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </label>
      <SaveButton />

    </form>
  );
}
