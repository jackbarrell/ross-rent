"use client";

import { useEffect, useState } from "react";
import { fetchOperations } from "@/lib/api";
import { OperationsSnapshot } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

export function OperationsPanel({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<(OperationsSnapshot & { hasData: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperations(propertyId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Loading operations data…</p>;
  if (!data || !data.hasData) {
    return (
      <div className="panelStack">
        <h2>Operations Tracking</h2>
        <p className="hintText">No booking data available for this property yet. Once the property is operational, booking and revenue data will appear here.</p>
      </div>
    );
  }

  return (
    <div className="panelStack">
      <h2>Operations Tracking</h2>
      <p className="hintText">Period: {data.period}</p>

      <div className="metricsGrid">
        <MetricCard label="Total Bookings" value={String(data.totalBookings)} />
        <MetricCard label="Total Nights" value={String(data.totalNights)} />
        <MetricCard label="Total Revenue" value={fmt$(data.totalRevenue)} />
        <MetricCard label="Actual ADR" value={fmt$(data.actualAdr)} />
        <MetricCard label="Actual Occupancy" value={fmtPct(data.actualOccupancy)} />
      </div>

      <h3>Monthly Breakdown</h3>
      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Month</th>
              <th className="cellRight">Bookings</th>
              <th className="cellRight">Nights</th>
              <th className="cellRight">Revenue</th>
              <th className="cellRight">ADR</th>
              <th className="cellRight">Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {data.monthlyBreakdown.map((m) => (
              <tr key={m.month}>
                <td className="cellBold">{m.month}</td>
                <td className="cellRight">{m.bookings}</td>
                <td className="cellRight">{m.nights}</td>
                <td className="cellRight">{fmt$(m.revenue)}</td>
                <td className="cellRight">{fmt$(m.adr)}</td>
                <td className="cellRight">{fmtPct(m.occupancy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
