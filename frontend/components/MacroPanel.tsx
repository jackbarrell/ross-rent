"use client";

import { useEffect, useState } from "react";
import { fetchMacroData } from "@/lib/api";
import { MacroData } from "@/lib/types";
import { MetricCard } from "./MetricCard";

function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }
function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export function MacroPanel({ locationKey }: { locationKey: string }) {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMacroData(locationKey)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locationKey]);

  if (loading) return <p>Loading macro data…</p>;
  if (!data) return <p className="error">No macro data available for {locationKey}.</p>;

  const growthColor = data.marketGrowthScore >= 80 ? "scoreGood" : data.marketGrowthScore >= 60 ? "scoreMid" : "scoreLow";

  return (
    <div className="panelStack">
      <div className="rowBetween">
        <h2>Macro / Geography Data</h2>
        <span className={`scoreBadge ${growthColor}`}>
          Market Growth: {data.marketGrowthScore}/100
        </span>
      </div>

      <div className="metricsGrid">
        <MetricCard label="Population Growth" value={fmtPct(data.populationGrowth)} />
        <MetricCard label="GDP Growth (proxy)" value={fmtPct(data.gdpGrowthProxy)} />
        <MetricCard label="Tourism Demand" value={`${data.tourismDemandIndex} / 10`} />
        <MetricCard label="Median Home Price" value={fmt$(data.medianHomePrice)} />
        <MetricCard label="Home Appreciation" value={fmtPct(data.homePriceAppreciation)} />
        <MetricCard label="Unemployment" value={fmtPct(data.unemploymentRate)} />
        <MetricCard label="Crime Index" value={data.crimeIndex.toFixed(1)} />
        <MetricCard label="Walk Score" value={String(data.walkScore)} />
        <MetricCard label="Economic Trend" value={`${data.economicTrendScore}/100`} />
      </div>

      <div>
        <h3>Key Market Notes</h3>
        <ul className="factorList neutral">
          {data.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}
