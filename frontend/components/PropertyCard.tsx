"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PropertyListing, DealScoreCard } from "@/lib/types";
import { fetchDealScore } from "@/lib/api";

const gradeColors: Record<string, string> = {
  "A+": "#00ff88", A: "#00ff88", "A-": "#00dd77",
  "B+": "#00ccff", B: "#00ccff", "B-": "#00aadd",
  "C+": "#ffcc00", C: "#ffcc00", "C-": "#ffaa00",
  "D+": "#ff7744", D: "#ff7744", "D-": "#ff5522",
  F: "#ff2244",
};

export function PropertyCard({ property }: { property: PropertyListing }) {
  const [score, setScore] = useState<DealScoreCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDealScore(property.id).then((s) => { if (!cancelled) setScore(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [property.id]);

  const gradeColor = score ? gradeColors[score.grade] || "#888" : "#888";
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/property/${property.id}`} className="card linkCard cardWithImage">
      <div className="cardImageWrap">
        {property.imageUrl && !imgError ? (
          <img
            src={property.imageUrl}
            alt={property.address}
            className="cardImage"
            loading="lazy"
            width={800}
            height={600}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="cardImageFallback">
            <div className="placeholderAiIcon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="rgba(56,189,248,.25)" strokeWidth="1.5" strokeDasharray="4 3" /><circle cx="24" cy="24" r="10" stroke="rgba(56,189,248,.35)" strokeWidth="1" /><circle cx="24" cy="24" r="3" fill="rgba(56,189,248,.4)" /><line x1="24" y1="4" x2="24" y2="14" stroke="rgba(56,189,248,.18)" strokeWidth="1" /><line x1="24" y1="34" x2="24" y2="44" stroke="rgba(56,189,248,.18)" strokeWidth="1" /><line x1="4" y1="24" x2="14" y2="24" stroke="rgba(56,189,248,.18)" strokeWidth="1" /><line x1="34" y1="24" x2="44" y2="24" stroke="rgba(56,189,248,.18)" strokeWidth="1" /></svg>
            </div>
            <span className="placeholderComingSoon">Coming Soon</span>
          </div>
        )}
        {score && (
          <span className="cardImageGrade" style={{ background: gradeColor, boxShadow: `0 2px 12px ${gradeColor}44` }}>
            {score.grade as string}
          </span>
        )}
        <div className="cardImageOverlay" />
      </div>
      <div className="cardBody">
        <div className="cardHeader">
          <h3>{property.address}</h3>
          <span className="pill">{property.propertyType}</span>
        </div>
        <p className="cardLocation">{property.city}, {property.state} {property.zip}</p>
        <p className="cardSpecs">{property.bedrooms} bd · {property.bathrooms} ba · {property.sqft.toLocaleString()} sqft</p>
        {score && (
          <>
            <div className="cardScoreRow">
              <span className="cardScoreLabel">Score</span>
              <div className="cardScoreBarTrack">
                <div className="cardScoreBarFill" style={{ width: `${score.overallScore}%`, background: gradeColor, boxShadow: `0 0 8px ${gradeColor}55` }} />
              </div>
              <span className="cardScoreValue" style={{ color: gradeColor }}>{score.overallScore}/100</span>
            </div>
            {score.recommendation && (
              <p className="cardRecommendation">{score.recommendation.slice(0, 80)}{score.recommendation.length > 80 ? "…" : ""}</p>
            )}
          </>
        )}
        <div className="cardFooter">
          <strong>${property.listPrice.toLocaleString()}</strong>
          <span>{property.daysOnMarket} DOM</span>
        </div>
      </div>
    </Link>
  );
}
