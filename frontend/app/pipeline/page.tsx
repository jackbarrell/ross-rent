"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDeals, saveDeal, removeDeal, fetchProperties } from "@/lib/api";
import { DealStatus, PropertyListing, SavedDeal } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

const STATUS_OPTIONS: DealStatus[] = ["watching", "analyzing", "under-offer", "purchased", "passed"];

const STATUS_COLORS: Record<DealStatus, string> = {
  watching: "var(--blue)",
  analyzing: "var(--amber)",
  "under-offer": "var(--green)",
  purchased: "var(--green)",
  passed: "var(--muted)",
};

export default function PipelinePage() {
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [properties, setProperties] = useState<Map<string, PropertyListing>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadDeals = async () => {
    const [d, p] = await Promise.all([
      fetchDeals(),
      fetchProperties(""),
    ]);
    setDeals(d.deals);
    setProperties(new Map(p.properties.map((prop) => [prop.id, prop])));
    setLoading(false);
  };

  useEffect(() => { loadDeals(); }, []);

  const handleStatusChange = async (propertyId: string, status: DealStatus) => {
    await saveDeal(propertyId, status);
    setDeals((prev) => prev.map((d) => d.propertyId === propertyId ? { ...d, status, updatedAt: new Date().toISOString() } : d));
  };

  const handleRemove = async (propertyId: string) => {
    await removeDeal(propertyId);
    setDeals((prev) => prev.filter((d) => d.propertyId !== propertyId));
  };

  if (loading) return <div className="pageStack fadeIn"><p>Loading pipeline…</p></div>;

  const grouped = STATUS_OPTIONS.map((status) => ({
    status,
    deals: deals.filter((d) => d.status === status),
  })).filter((g) => g.deals.length > 0);

  return (
    <div className="pageStack fadeIn">
      <Link href="/" className="backLink">← Back</Link>
      <h1>Deal Pipeline</h1>
      <p className="hintText">{deals.length} properties in pipeline</p>

      {deals.length === 0 ? (
        <section className="panel">
          <p className="hintText">No properties saved yet. Visit a property detail page and click &quot;Save to Pipeline&quot; to start tracking deals.</p>
        </section>
      ) : (
        grouped.map((group) => (
          <section key={group.status}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[group.status], display: "inline-block" }} />
              {group.status.charAt(0).toUpperCase() + group.status.slice(1).replace("-", " ")}
              <span className="pillSmall" style={{ marginLeft: 4 }}>{group.deals.length}</span>
            </h2>
            <div className="pipelineGrid">
              {group.deals.map((deal) => {
                const prop = properties.get(deal.propertyId);
                return (
                  <div key={deal.propertyId} className="panel pipelineCard">
                    <div className="rowBetween">
                      <Link href={`/property/${deal.propertyId}`} className="backLink" style={{ fontWeight: 600 }}>
                        {prop?.address ?? deal.propertyId}
                      </Link>
                      <button className="btnDanger" onClick={() => handleRemove(deal.propertyId)} title="Remove">✕</button>
                    </div>
                    {prop && (
                      <p className="hintText">
                        {prop.city}, {prop.state} · {prop.bedrooms} bd / {prop.bathrooms} ba · {fmt$(prop.listPrice)}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          className={deal.status === s ? "btnPrimary" : "btnSecondary"}
                          style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                          onClick={() => handleStatusChange(deal.propertyId, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <p className="hintText" style={{ marginTop: 4, fontSize: "0.7rem" }}>
                      Saved: {new Date(deal.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
