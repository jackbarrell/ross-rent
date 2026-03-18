"use client";

import { MonthlyRevenue } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export function RevenueChart({ monthlyRevenue }: { monthlyRevenue: MonthlyRevenue[] }) {
  const maxRev = Math.max(...monthlyRevenue.map((m) => m.revenue));

  return (
    <div className="panelStack">
      <h3>Monthly Revenue Projection</h3>
      <div className="revenueChart">
        {monthlyRevenue.map((m) => {
          const pct = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
          return (
            <div key={m.month} className="revenueBar">
              <div className="revenueBarLabel">{m.label}</div>
              <div className="revenueBarTrack">
                <div className="revenueBarFill" style={{ width: `${pct}%` }} />
              </div>
              <div className="revenueBarValue">{fmt$(m.revenue)}</div>
            </div>
          );
        })}
      </div>
      <div className="revenueChartLegend">
        <span>ADR range: {fmt$(Math.min(...monthlyRevenue.map(m => m.adr)))} – {fmt$(Math.max(...monthlyRevenue.map(m => m.adr)))}</span>
        <span>Occupancy range: {Math.round(Math.min(...monthlyRevenue.map(m => m.occupancy)) * 100)}% – {Math.round(Math.max(...monthlyRevenue.map(m => m.occupancy)) * 100)}%</span>
      </div>
    </div>
  );
}
