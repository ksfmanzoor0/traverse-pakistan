import { requireAdmin } from "@/lib/admin/guard";
import { listVehicleTypes } from "@/services/vehicle.service";
import { saveVehicleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function VehiclesAdminPage() {
  await requireAdmin();
  const vehicles = await listVehicleTypes();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Vehicles
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Operator-editable transport types used by the pricing engine.
          NCP variants (Skardu/Gilgit permit rate) auto-swap when a package&apos;s
          starting city is KDU or GIL.
        </p>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
              <th className="text-left p-3">Vehicle</th>
              <th className="text-left p-3">km/L</th>
              <th className="text-left p-3">Max people</th>
              <th className="text-left p-3">Rent / day</th>
              <th className="text-left p-3">NCP</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                  {v.displayName}
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{v.code}</div>
                </td>
                <td className="p-3 align-top" colSpan={5}>
                  <form action={saveVehicleAction} className="grid grid-cols-[80px_80px_120px_60px_auto] gap-2 items-center">
                    <input type="hidden" name="id" value={v.id} />
                    <input
                      type="number"
                      name="kmPerLitre"
                      step="0.1"
                      defaultValue={v.kmPerLitre}
                      className="rounded px-2 py-1.5 text-sm w-full"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="number"
                      name="maxPeople"
                      defaultValue={v.maxPeople}
                      className="rounded px-2 py-1.5 text-sm w-full"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                    />
                    <input
                      type="number"
                      name="rentPerDay"
                      defaultValue={v.rentPerDay}
                      className="rounded px-2 py-1.5 text-sm w-full"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                    />
                    <span className="text-xs text-center" style={{ color: v.isNcp ? "var(--accent-warning)" : "var(--text-tertiary)" }}>
                      {v.isNcp ? "yes" : "—"}
                    </span>
                    <button
                      type="submit"
                      className="rounded px-3 py-1.5 text-sm"
                      style={{ background: "var(--accent-primary)", color: "var(--on-dark)" }}
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
