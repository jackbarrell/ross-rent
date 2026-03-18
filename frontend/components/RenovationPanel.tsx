"use client";

import { useEffect, useState } from "react";
import { fetchRenovation, fetchRenovationCustom, fetchCostLibrary } from "@/lib/api";
import { CostLibraryItem, PropertyListing, RenovationEstimate } from "@/lib/types";

function fmt$(n: number) { return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

interface ManualItem {
  category: string;
  quantity: number;
}

export function RenovationPanel({ propertyId, property }: { propertyId: string; property: PropertyListing }) {
  const [estimate, setEstimate] = useState<RenovationEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [costLib, setCostLib] = useState<Record<string, CostLibraryItem> | null>(null);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRenovation(propertyId)
      .then(setEstimate)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  const loadCostLib = async () => {
    if (!costLib) {
      const lib = await fetchCostLibrary();
      setCostLib(lib);
    }
  };

  const toggleManual = async () => {
    if (!showManual) await loadCostLib();
    setShowManual(!showManual);
  };

  const addItem = () => {
    if (!costLib) return;
    const firstKey = Object.keys(costLib)[0];
    setManualItems([...manualItems, { category: firstKey, quantity: 1 }]);
  };

  const updateItem = (idx: number, field: keyof ManualItem, value: string | number) => {
    setManualItems(manualItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setManualItems(manualItems.filter((_, i) => i !== idx));
  };

  const submitManual = async () => {
    if (manualItems.length === 0) return;
    setSubmitting(true);
    try {
      const result = await fetchRenovationCustom(propertyId, manualItems);
      setEstimate(result);
    } catch {} finally { setSubmitting(false); }
  };

  if (loading) return <p>Analysing renovation scope…</p>;
  if (!estimate) return <p className="error">Could not generate renovation estimate.</p>;

  return (
    <div className="panelStack">
      <div className="rowBetween">
        <h2>Renovation Cost Estimate</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="pillAi">{estimate.methodology === "description-analysis" ? "Description Analysis" : "Manual"}</span>
          <button className="btnSecondary" onClick={toggleManual}>
            {showManual ? "Hide Manual Editor" : "Custom Renovation ✎"}
          </button>
        </div>
      </div>

      <p className="hintText">
        Based on analysis of the property description ({property.bedrooms} bd / {property.bathrooms} ba / {property.sqft.toLocaleString()} sqft).
        Timeline estimate: <strong>{estimate.timelineWeeks} weeks</strong>.
      </p>

      {/* Manual Renovation Editor */}
      {showManual && costLib && (
        <div className="manualRenoEditor">
          <h3>Custom Renovation Items</h3>
          <p className="hintText">Select work items from the cost library and specify quantities.</p>
          {manualItems.map((item, idx) => (
            <div key={idx} className="manualRenoRow">
              <select
                className="numInput"
                value={item.category}
                onChange={(e) => updateItem(idx, "category", e.target.value)}
                style={{ flex: 2 }}
              >
                {Object.entries(costLib).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label} ({fmt$(val.lowPerUnit)}–{fmt$(val.highPerUnit)} / {val.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="numInput"
                value={item.quantity}
                min={1}
                onChange={(e) => updateItem(idx, "quantity", Number(e.target.value) || 1)}
                style={{ width: 80 }}
              />
              <button className="btnDanger" onClick={() => removeItem(idx)}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btnSecondary" onClick={addItem}>+ Add Item</button>
            <button className="btnPrimary" onClick={submitManual} disabled={manualItems.length === 0 || submitting}>
              {submitting ? "Calculating…" : "Calculate Custom Renovation"}
            </button>
          </div>
        </div>
      )}

      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Work Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th className="cellRight">Low</th>
              <th className="cellRight">High</th>
              <th className="cellRight">Estimate</th>
            </tr>
          </thead>
          <tbody>
            {estimate.items.map((item, i) => (
              <tr key={i}>
                <td className="cellBold">{item.label}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td className="cellRight">{fmt$(item.lowCost)}</td>
                <td className="cellRight">{fmt$(item.highCost)}</td>
                <td className="cellRight">{fmt$(item.estimatedCost)}</td>
              </tr>
            ))}
            <tr className="rowTotal">
              <td colSpan={3}>Total CAPEX</td>
              <td className="cellRight">{fmt$(estimate.totalCapexLow)}</td>
              <td className="cellRight">{fmt$(estimate.totalCapexHigh)}</td>
              <td className="cellRight">{fmt$(estimate.totalCapexEstimate)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="totalBar">
        Estimated renovation budget: <strong>{fmt$(estimate.totalCapexEstimate)}</strong>
        <span style={{ marginLeft: 16, color: "var(--muted)" }}>
          (range: {fmt$(estimate.totalCapexLow)} – {fmt$(estimate.totalCapexHigh)})
        </span>
      </div>
    </div>
  );
}
