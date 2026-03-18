"use client";

import { useEffect, useState } from "react";
import { fetchHeatmap } from "@/lib/api";
import { SensitivityHeatmap } from "@/lib/types";

function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

function irrColor(irr: number): string {
  if (irr >= 0.20) return "rgba(34,197,94,0.7)";
  if (irr >= 0.15) return "rgba(52,211,153,0.5)";
  if (irr >= 0.10) return "rgba(56,189,248,0.4)";
  if (irr >= 0.05) return "rgba(251,191,36,0.35)";
  if (irr >= 0) return "rgba(251,191,36,0.2)";
  return "rgba(248,113,113,0.35)";
}

export function HeatmapPanel({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<SensitivityHeatmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmap(propertyId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Generating sensitivity heatmap…</p>;
  if (!data) return <p className="error">Could not generate heatmap.</p>;

  return (
    <div className="panelStack">
      <h2>Sensitivity Heatmap</h2>
      <p className="hintText">IRR across ADR and Occupancy multipliers. Base ADR: ${data.baseAdr.toFixed(0)}, Base Occupancy: {fmtPct(data.baseOccupancy)}.</p>

      <div className="heatmapWrap">
        <div className="heatmapGrid" style={{ gridTemplateColumns: `80px repeat(${data.adrSteps.length}, 1fr)` }}>
          {/* Header row */}
          <div className="heatmapCorner">ADR ↓ / Occ →</div>
          {data.occupancySteps.map((occ) => (
            <div key={occ} className="heatmapColHeader">
              {occ === 1.0 ? "Base" : `${(occ * 100).toFixed(0)}%`}
            </div>
          ))}

          {/* Data rows */}
          {data.adrSteps.map((adrMult) => (
            <>
              <div key={`label-${adrMult}`} className="heatmapRowHeader">
                {adrMult === 1.0 ? "Base" : `${(adrMult * 100).toFixed(0)}%`}
              </div>
              {data.occupancySteps.map((occMult) => {
                const cell = data.cells.find((c) => c.adrMultiplier === adrMult && c.occupancyMultiplier === occMult);
                const irr = cell?.irr ?? 0;
                const isBase = adrMult === 1.0 && occMult === 1.0;
                return (
                  <div
                    key={`${adrMult}-${occMult}`}
                    className={`heatmapCell ${isBase ? "heatmapCellBase" : ""}`}
                    style={{ background: irrColor(irr) }}
                    title={`ADR: ${(adrMult * 100).toFixed(0)}%, Occ: ${(occMult * 100).toFixed(0)}%\nIRR: ${fmtPct(irr)}\nNOI: $${(cell?.noi ?? 0).toLocaleString()}`}
                  >
                    <span className="heatmapIrr">{fmtPct(irr)}</span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmapLegend">
        <span className="heatmapLegendItem"><span style={{ background: "rgba(248,113,113,0.35)" }} className="heatmapLegendColor" />Negative</span>
        <span className="heatmapLegendItem"><span style={{ background: "rgba(251,191,36,0.2)" }} className="heatmapLegendColor" />0–5%</span>
        <span className="heatmapLegendItem"><span style={{ background: "rgba(251,191,36,0.35)" }} className="heatmapLegendColor" />5–10%</span>
        <span className="heatmapLegendItem"><span style={{ background: "rgba(56,189,248,0.4)" }} className="heatmapLegendColor" />10–15%</span>
        <span className="heatmapLegendItem"><span style={{ background: "rgba(52,211,153,0.5)" }} className="heatmapLegendColor" />15–20%</span>
        <span className="heatmapLegendItem"><span style={{ background: "rgba(34,197,94,0.7)" }} className="heatmapLegendColor" />20%+</span>
      </div>
    </div>
  );
}
