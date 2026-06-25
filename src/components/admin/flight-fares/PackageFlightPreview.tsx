import {
  listFlightInclusivePackages,
  resolveFlightCostForPackage,
  type DepartureCity,
  type FlightCostResult,
  type ResolvedLeg,
} from "@/services/flight-cost.service";

const CITIES: DepartureCity[] = ["ISB", "LHE", "KHI"];

function fmtPkr(n: number): string {
  return n.toLocaleString();
}

function legBadge(leg: ResolvedLeg): { label: string; color: string } {
  switch (leg.source) {
    case "manual":
      return { label: "manual", color: "var(--accent-warning)" };
    case "averaged":
      return { label: `avg ${leg.carriers.length}`, color: "var(--accent-info)" };
    case "single":
      return { label: leg.carriers[0]?.airline ?? "single", color: "var(--text-tertiary)" };
    case "unresolved":
      return { label: "no data", color: "var(--accent-danger)" };
    case "skipped":
      return { label: "n/a", color: "var(--text-tertiary)" };
  }
}

function ResolvedRow({ result }: { result: FlightCostResult }) {
  return (
    <div
      className="rounded-md p-3 text-xs"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {result.departureCity}
        </span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          PKR {fmtPkr(result.perPerson)}
        </span>
      </div>
      <div className="space-y-1.5">
        {result.legs.map((leg, i) => {
          const badge = legBadge(leg);
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <span style={{ color: "var(--text-secondary)" }}>
                {leg.from}→{leg.to}{" "}
                <span style={{ color: "var(--text-tertiary)" }}>
                  ({leg.departDate ?? "—"})
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: badge.color, color: "var(--on-dark)" }}
                >
                  {badge.label}
                </span>
                <span style={{ color: "var(--text-primary)" }}>{fmtPkr(leg.perPerson)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function defaultDepartureDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

interface PackageFlightPreviewProps {
  departureDate?: string;
}

export async function PackageFlightPreview({ departureDate }: PackageFlightPreviewProps) {
  const date = departureDate || defaultDepartureDate();
  const pkgs = await listFlightInclusivePackages();

  // Resolve every (package, city) pair in parallel.
  const matrix = await Promise.all(
    pkgs.map(async (pkg) => {
      const results = await Promise.all(
        CITIES.map((city) =>
          resolveFlightCostForPackage({
            packageSlug: pkg.slug,
            departureCity: city,
            departureDate: date,
          }),
        ),
      );
      return { pkg, results: results.filter((r): r is FlightCostResult => r !== null) };
    }),
  );

  return (
    <section
      className="rounded-lg p-6 space-y-4"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Package flight cost preview
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            What each flight-inclusive package would charge per traveler for the trip starting{" "}
            <strong>{date}</strong>. Inbound leg is dated to the trip&apos;s last day.
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm" method="get">
          <label style={{ color: "var(--text-secondary)" }}>Sample departure:</label>
          <input
            type="date"
            name="preview_date"
            defaultValue={date}
            className="rounded px-2 py-1"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            className="rounded px-3 py-1 text-sm"
            style={{
              background: "var(--accent-primary)",
              color: "var(--on-dark)",
            }}
          >
            Update
          </button>
        </form>
      </div>

      {matrix.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No packages declare flight legs yet.
        </div>
      ) : (
        <div className="space-y-4">
          {matrix.map(({ pkg, results }) => (
            <div
              key={pkg.slug}
              className="rounded-lg p-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {pkg.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {pkg.slug} · {pkg.duration} days · {pkg.destinationSlug}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {results.map((r) => (
                  <ResolvedRow key={r.departureCity} result={r} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
