import {
  listPackagesWithAddons,
  quotePackageAddons,
  type HomeCity,
  type PackageQuote,
  type ResolvedFlightLeg,
} from "@/services/addon-cost.service";

const CITIES: HomeCity[] = ["ISB", "LHE", "KHI"];

function fmtPkr(n: number): string {
  return n.toLocaleString();
}

function legBadge(leg: ResolvedFlightLeg): { label: string; color: string } {
  switch (leg.source) {
    case "manual":
      return { label: "manual", color: "var(--accent-warning)" };
    case "averaged":
      return { label: `avg ${leg.carriers.length}`, color: "var(--accent-info)" };
    case "single":
      return { label: leg.carriers[0]?.airline ?? "single", color: "var(--text-tertiary)" };
    case "unresolved":
      return { label: "no data", color: "var(--accent-danger)" };
  }
}

function QuoteCard({ quote }: { quote: PackageQuote }) {
  if (quote.homeInStartingCities) {
    return (
      <div
        className="rounded-md p-3 text-xs"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {quote.homeCity}
          </span>
          <span style={{ color: "var(--text-tertiary)" }}>local</span>
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          No join transport — package starts in {quote.startingCities.join("/")}.
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-md p-3 text-xs"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {quote.homeCity}
        </span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          PKR {fmtPkr(quote.addonCostPerPerson)}
        </span>
      </div>
      <div className="space-y-2">
        {quote.addons.map((addon) => (
          <div key={addon.addonId} className="space-y-1">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--text-secondary)" }}>
                {addon.label}{" "}
                {addon.isRequired ? (
                  <span style={{ color: "var(--text-tertiary)" }}>(req)</span>
                ) : null}
              </span>
              <span style={{ color: "var(--text-primary)" }}>PKR {fmtPkr(addon.perPerson)}</span>
            </div>
            {addon.flightLegs?.map((leg, i) => {
              const badge = legBadge(leg);
              return (
                <div key={i} className="flex items-center justify-between pl-3">
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {leg.from}→{leg.to} <span>({leg.departDate})</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ background: badge.color, color: "var(--on-dark)" }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>{fmtPkr(leg.perPerson)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function defaultStartDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

interface Props {
  departureDate?: string;
}

export async function PackageFlightPreview({ departureDate }: Props) {
  const date = departureDate || defaultStartDate();
  const pkgs = await listPackagesWithAddons();

  const matrix = await Promise.all(
    pkgs.map(async (pkg) => {
      const quotes = await Promise.all(
        CITIES.map((home) =>
          quotePackageAddons({ packageSlug: pkg.slug, homeCity: home, startDate: date }),
        ),
      );
      return { pkg, quotes: quotes.filter((q): q is PackageQuote => q !== null) };
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
            Package add-on cost preview
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Per-traveler add-on cost (flight legs today; bus later) for trip starting{" "}
            <strong>{date}</strong>. Travelers already in the package&apos;s starting city show
            &quot;local&quot;.
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm" method="get">
          <label style={{ color: "var(--text-secondary)" }}>Sample start:</label>
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
            style={{ background: "var(--accent-primary)", color: "var(--on-dark)" }}
          >
            Update
          </button>
        </form>
      </div>

      {matrix.length === 0 ? (
        <div className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No packages declare add-ons yet.
        </div>
      ) : (
        <div className="space-y-4">
          {matrix.map(({ pkg, quotes }) => (
            <div
              key={pkg.slug}
              className="rounded-lg p-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div className="mb-3">
                <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {pkg.name}
                </div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {pkg.slug} · {pkg.duration} days · starts in {pkg.startingCities.join("/")}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {quotes.map((q) => (
                  <QuoteCard key={q.homeCity} quote={q} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
