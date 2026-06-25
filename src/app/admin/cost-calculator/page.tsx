import { requireAdmin } from "@/lib/admin/guard";
import { CostCalculator } from "@/components/admin/cost-calculator/CostCalculator";

export const dynamic = "force-dynamic";

export default async function CostCalculatorPage() {
  await requireAdmin();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Cost Calculator
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Quote builder — transport, hotel, guide, flight. Standalone tool today; will wire to
          package data and addon-cost service next.
        </p>
      </div>

      <CostCalculator />
    </div>
  );
}
