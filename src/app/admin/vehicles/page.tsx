import { requireAdmin } from "@/lib/admin/guard";
import { listVehicleTypes, getEngineConfig } from "@/services/vehicle.service";
import { saveVehicleAction, saveEngineConfigAction } from "./actions";

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
        </p>
      </div>

      {/* Engine globals */}
      <section
        className="rounded-lg p-5 space-y-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          Engine config
        </h2>
        <form action={saveEngineConfigAction} className="grid gap-3 sm:grid-cols-5 items-end">
          <label className="block text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Fuel / litre (PKR)</span>
            <input
              type="number"
              name="fuelPricePerLitre"
              defaultValue={config.fuelPricePerLitre}
              className="mt-1 w-full rounded px-2 py-2 text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
          </label>
          <label className="block text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Package buffer (km)</span>
            <input
              type="number"
              name="packageBufferKm"
              defaultValue={config.packageBufferKm}
              className="mt-1 w-full rounded px-2 py-2 text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
          </label>
          <label className="block text-sm">
            <span style={{ color: "var(--text-secondary)" }}>LHE extension (km)</span>
            <input
              type="number"
              name="lheExtensionKm"
              defaultValue={config.lheExtensionKm}
              className="mt-1 w-full rounded px-2 py-2 text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
          </label>
          <label className="block text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Guide / day (PKR)</span>
            <input
              type="number"
              name="guidePerDay"
              defaultValue={config.guidePerDay}
              className="mt-1 w-full rounded px-2 py-2 text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            />
          </label>
          <button
            type="submit"
            className="rounded px-4 py-2 text-sm h-[38px]"
            style={{ background: "var(--accent-primary)", color: "var(--on-dark)" }}
          >
            Save engine config
          </button>
        </form>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Profit % is set per-quote on the calculator, not here.
        </p>
      </section>

      {/* Vehicle types */}
      <section
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <div className="p-5 pb-3">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Vehicles
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
              <th className="text-left p-3 w-[180px]">Vehicle</th>
              <th className="text-left p-3 w-[110px]">km/L</th>
              <th className="text-left p-3 w-[110px]">Max people</th>
              <th className="text-left p-3 w-[140px]">Rent / day</th>
              <th className="text-left p-3 w-[60px]">NCP</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td className="p-3 font-medium align-middle" style={{ color: "var(--text-primary)" }}>
                  <form id={`vehicle-${v.id}`} action={saveVehicleAction}>
                    <input type="hidden" name="id" value={v.id} />
                  </form>
                  {v.displayName}
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{v.code}</div>
                </td>
                <td className="p-3">
                  <input
                    form={`vehicle-${v.id}`}
                    type="number"
                    name="kmPerLitre"
                    step="0.1"
                    defaultValue={v.kmPerLitre}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                  />
                </td>
                <td className="p-3">
                  <input
                    form={`vehicle-${v.id}`}
                    type="number"
                    name="maxPeople"
                    defaultValue={v.maxPeople}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                  />
                </td>
                <td className="p-3">
                  <input
                    form={`vehicle-${v.id}`}
                    type="number"
                    name="rentPerDay"
                    defaultValue={v.rentPerDay}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                  />
                </td>
                <td className="p-3 text-xs" style={{ color: v.isNcp ? "var(--accent-warning)" : "var(--text-tertiary)" }}>
                  {v.isNcp ? "yes" : "—"}
                </td>
                <td className="p-3 text-right">
                  <button
                    form={`vehicle-${v.id}`}
                    type="submit"
                    className="rounded px-3 py-1.5 text-sm"
                    style={{ background: "var(--accent-primary)", color: "var(--on-dark)" }}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
