"use client";

import { useEffect, useMemo, useState } from "react";
import { LocationSelector } from "@/components/LocationSelector";
import { PropertyCard } from "@/components/PropertyCard";
import { fetchLocations, fetchProperties, fetchRanking } from "@/lib/api";
import { PropertyListing, RankedProperty } from "@/lib/types";
import Link from "next/link";

type SortKey = "price-asc" | "price-desc" | "beds-desc" | "dom-asc";
type ViewMode = "grid" | "ranking";

export default function HomePage() {
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [ranked, setRanked] = useState<RankedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("price-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [{ locations: locs }, { properties: props }] = await Promise.all([
          fetchLocations(),
          fetchProperties(selectedLocation)
        ]);
        setLocations(locs);
        setProperties(props);
        setError(null);
      } catch {
        setError("Unable to load data from backend. Is the API running on port 4000?");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedLocation]);

  // Load ranking when view switches to ranking mode
  useEffect(() => {
    if (viewMode !== "ranking") return;
    let cancelled = false;
    const loadRanking = async () => {
      try {
        const { ranked: r } = await fetchRanking(selectedLocation);
        if (!cancelled) setRanked(r);
      } catch {
        if (!cancelled) setRanked([]);
      }
    };
    loadRanking();
    return () => { cancelled = true; };
  }, [viewMode, selectedLocation]);

  const sortedProperties = useMemo(() => {
    const sorted = [...properties];
    switch (sortKey) {
      case "price-asc": sorted.sort((a, b) => a.listPrice - b.listPrice); break;
      case "price-desc": sorted.sort((a, b) => b.listPrice - a.listPrice); break;
      case "beds-desc": sorted.sort((a, b) => b.bedrooms - a.bedrooms); break;
      case "dom-asc": sorted.sort((a, b) => a.daysOnMarket - b.daysOnMarket); break;
    }
    return sorted;
  }, [properties, sortKey]);

  return (
    <div className="pageStack">
      <header className="hero panel">
        <h1>RossRent — STR Investment Screener</h1>
        <p>
          Search for-sale properties, pull short-term rental comps, combine datasets,
          and get transparent investment analysis with AI-generated summaries.
        </p>
        <nav className="heroNav">
          <Link href="/portfolio" className="heroLink">📊 Portfolio Dashboard</Link>
          <Link href="/forecast" className="heroLink">📈 Forecast vs Actual</Link>
        </nav>
      </header>

      <LocationSelector
        locations={locations}
        selected={selectedLocation}
        onChange={setSelectedLocation}
      />

      <section className="panel">
        <div className="rowBetween">
          <div className="viewTabs">
            <button
              className={`tabBtn ${viewMode === "grid" ? "tabActive" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              Property Grid
            </button>
            <button
              className={`tabBtn ${viewMode === "ranking" ? "tabActive" : ""}`}
              onClick={() => setViewMode("ranking")}
            >
              Attractiveness Ranking
            </button>
          </div>
          {viewMode === "grid" && (
            <div className="sortRow">
              <label htmlFor="sort" className="sortLabel">Sort by</label>
              <select id="sort" className="selectSmall" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="beds-desc">Bedrooms ↓</option>
                <option value="dom-asc">Newest listings</option>
              </select>
            </div>
          )}
        </div>

        {loading && <p>Loading properties…</p>}
        {error && <p className="error">{error}</p>}

        {viewMode === "grid" && !loading && (
          <>
            <p className="countLabel">{sortedProperties.length} properties found</p>
            <div className="grid">
              {sortedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </>
        )}

        {viewMode === "ranking" && !loading && (
          <>
            <p className="countLabel">{ranked.length} properties ranked by investment attractiveness</p>
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Address</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Beds</th>
                    <th>Price</th>
                    <th>Est. ADR</th>
                    <th>Monthly Rev</th>
                    <th>NOI</th>
                    <th>Yield</th>
                    <th>Score</th>
                    <th>Confidence</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((r, idx) => (
                    <tr key={r.propertyId}>
                      <td>{idx + 1}</td>
                      <td className="cellBold">{r.address}</td>
                      <td>{r.city}, {r.state}</td>
                      <td><span className="pillSmall">{r.propertyType}</span></td>
                      <td>{r.bedrooms}</td>
                      <td>${r.listPrice.toLocaleString()}</td>
                      <td>${r.estimatedAdr.toFixed(0)}</td>
                      <td>${r.estimatedMonthlyGrossRevenue.toLocaleString()}</td>
                      <td>${r.estimatedNetOperatingIncome.toLocaleString()}</td>
                      <td>{(r.yieldProxy * 100).toFixed(2)}%</td>
                      <td>
                        <span className={`scoreBadge ${r.attractivenessScore >= 60 ? "scoreGood" : r.attractivenessScore >= 45 ? "scoreMid" : "scoreLow"}`}>
                          {r.attractivenessScore}
                        </span>
                      </td>
                      <td>{r.confidence}</td>
                      <td><Link href={`/property/${r.propertyId}`}>View →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
