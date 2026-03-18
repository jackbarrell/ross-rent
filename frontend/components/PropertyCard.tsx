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
    fetchDealScore(property.id).then(setScore).catch(() => {});
  }, [property.id]);

  return (
    <Link href={`/property/${property.id}`} className="card linkCard cardWithImage">
      {property.imageUrl && (
        <div className="cardImageWrap">
          <img
            src={property.imageUrl}
            alt={property.address}
            className="cardImage"
            loading="lazy"
          />
          {score && (
            <span className="cardImageGrade" style={{ background: gradeColors[score.grade] || "#888" }}>
              {score.grade as string}
            </span>
          )}
        </div>
      )}
      <div className="cardBody">
        <div className="cardHeader">
          <h3>{property.address}</h3>
          <span className="pill">{property.propertyType}</span>
        </div>
        <p className="cardLocation">{property.city}, {property.state} {property.zip}</p>
        <p className="cardSpecs">{property.bedrooms} bd · {property.bathrooms} ba · {property.sqft.toLocaleString()} sqft</p>
        {score && (
          <div className="cardScoreRow">
            <span className="cardScoreLabel">Score</span>
            <div className="cardScoreBarTrack">
              <div className="cardScoreBarFill" style={{ width: `${score.overallScore}%`, background: gradeColors[score.grade] || "#888" }} />
            </div>
            <span className="cardScoreValue">{score.overallScore}/100</span>
          </div>
        )}
        <div className="cardFooter">
          <strong>${property.listPrice.toLocaleString()}</strong>
          <span>{property.daysOnMarket} DOM</span>
        </div>
      </div>
    </Link>
  );
}
