"use client";

import { useEffect, useState } from "react";
import { fetchDealScore } from "@/lib/api";
import { DealScoreCard } from "@/lib/types";

function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

const GRADE_COLORS: Record<string, string> = {
  "A+": "#22c55e", "A": "#34d399", "A-": "#4ade80",
  "B+": "#38bdf8", "B": "#60a5fa", "B-": "#93c5fd",
  "C+": "#fbbf24", "C": "#f59e0b", "C-": "#f97316",
  "D": "#f87171", "F": "#ef4444",
};

export function DealScorePanel({ propertyId }: { propertyId: string }) {
  const [score, setScore] = useState<DealScoreCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDealScore(propertyId)
      .then(setScore)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <p>Calculating deal score…</p>;
  if (!score) return <p className="error">Could not calculate deal score.</p>;

  const gradeColor = GRADE_COLORS[score.grade] ?? "var(--text)";

  // Radar chart via SVG
  const radarSize = 200;
  const center = radarSize / 2;
  const maxRadius = center - 20;
  const axes = score.radarData;
  const angleStep = (2 * Math.PI) / axes.length;

  const getPoint = (value: number, idx: number) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    const r = (value / 100) * maxRadius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygonPoints = axes.map((a, i) => {
    const p = getPoint(a.value, i);
    return `${p.x},${p.y}`;
  }).join(" ");

  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="panelStack">
      <h2>Deal Score Card</h2>

      {/* Grade + Score */}
      <div className="dealGradeHeader">
        <div className="dealGradeBig" style={{ color: gradeColor, borderColor: gradeColor }}>
          {score.grade}
        </div>
        <div className="dealGradeInfo">
          <div className="dealGradeScore">{score.overallScore}<span className="dealGradeMax">/100</span></div>
          <p className="dealGradeRec">{score.recommendation}</p>
        </div>
      </div>

      <div className="twoCol" style={{ alignItems: "start" }}>
        {/* Radar Chart */}
        <div className="radarContainer">
          <h3>Score Breakdown</h3>
          <svg viewBox={`0 0 ${radarSize} ${radarSize}`} className="radarSvg">
            {/* Grid circles */}
            {gridLevels.map((level) => (
              <polygon
                key={level}
                points={axes.map((_, i) => {
                  const p = getPoint(level, i);
                  return `${p.x},${p.y}`;
                }).join(" ")}
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.5"
              />
            ))}
            {/* Axis lines */}
            {axes.map((_, i) => {
              const p = getPoint(100, i);
              return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="0.5" />;
            })}
            {/* Data polygon */}
            <polygon
              points={polygonPoints}
              fill="rgba(56,189,248,0.15)"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            {/* Data points */}
            {axes.map((a, i) => {
              const p = getPoint(a.value, i);
              return <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />;
            })}
            {/* Labels */}
            {axes.map((a, i) => {
              const p = getPoint(115, i);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--text-secondary)"
                  fontSize="6"
                  fontWeight="600"
                >
                  {a.axis.length > 12 ? a.axis.slice(0, 12) + "…" : a.axis}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Breakdown Table */}
        <div>
          <h3>Category Scores</h3>
          <div className="scoreBreakdownList">
            {score.breakdown.map((b) => (
              <div key={b.category} className="scoreBreakdownRow">
                <div className="scoreBreakdownHeader">
                  <span className="scoreBreakdownCat">{b.category}</span>
                  <span className="scoreBreakdownVal">{b.score}<span style={{ color: "var(--muted)" }}>/100</span></span>
                </div>
                <div className="scoreBarTrack">
                  <div
                    className="scoreBarFill"
                    style={{
                      width: `${b.score}%`,
                      background: b.score >= 70 ? "var(--green)" : b.score >= 50 ? "var(--amber)" : "var(--red)",
                    }}
                  />
                </div>
                <p className="scoreBreakdownDetail">{b.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="twoCol">
        <div>
          <h3 style={{ color: "var(--green)" }}>Strengths</h3>
          <ul className="factorList upside">
            {score.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div>
          <h3 style={{ color: "var(--red)" }}>Weaknesses</h3>
          <ul className="factorList downside">
            {score.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
