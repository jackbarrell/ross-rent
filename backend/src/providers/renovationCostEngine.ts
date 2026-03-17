import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CostLibraryItem, PropertyListing, RenovationEstimate, RenovationLineItem } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const costLibPath = path.resolve(__dirname, "../../../data/cost_library.json");

let costLibCache: Record<string, CostLibraryItem> | null = null;

function loadCostLibrary(): Record<string, CostLibraryItem> {
  if (!costLibCache) {
    costLibCache = JSON.parse(fs.readFileSync(costLibPath, "utf-8"));
  }
  return costLibCache!;
}

function makeItem(
  category: string,
  lib: Record<string, CostLibraryItem>,
  quantity: number
): RenovationLineItem {
  const entry = lib[category];
  if (!entry) throw new Error(`Unknown cost category: ${category}`);
  const low = entry.lowPerUnit * quantity;
  const high = entry.highPerUnit * quantity;
  const estimated = Math.round((low + high) / 2);
  return {
    category,
    label: entry.label,
    quantity,
    unit: entry.unit,
    lowCost: low,
    highCost: high,
    estimatedCost: estimated,
    timelineDays: entry.timelineDays,
  };
}

/**
 * AI-assisted inference: analyse the property description to infer likely
 * renovation works. Uses keyword matching as a heuristic (real system would
 * use an LLM).
 */
export function inferRenovation(property: PropertyListing): RenovationEstimate {
  const lib = loadCostLibrary();
  const items: RenovationLineItem[] = [];
  const desc = (property.description ?? "").toLowerCase();

  // ─── Always include for STR conversion ───
  items.push(makeItem("painting_interior", lib, property.sqft));
  items.push(makeItem("flooring_lvp", lib, Math.round(property.sqft * 0.7)));
  items.push(makeItem("furnishing_str", lib, property.bedrooms));
  items.push(makeItem("landscaping", lib, 1));

  // ─── Conditional based on description keywords ───
  const needsHeavyReno =
    desc.includes("dated") ||
    desc.includes("original") ||
    desc.includes("needs work") ||
    desc.includes("fixer") ||
    desc.includes("potential") ||
    desc.includes("investor");

  if (needsHeavyReno) {
    items.push(makeItem("kitchen_full", lib, 1));
    items.push(makeItem("bathroom_full", lib, property.bathrooms));
  } else {
    items.push(makeItem("kitchen_cosmetic", lib, 1));
    items.push(
      makeItem("bathroom_cosmetic", lib, Math.max(1, Math.ceil(property.bathrooms / 2)))
    );
  }

  if (
    desc.includes("hvac") ||
    desc.includes("heating") ||
    desc.includes("cooling") ||
    desc.includes("old") ||
    needsHeavyReno
  ) {
    items.push(makeItem("hvac_replace", lib, 1));
  }

  if (desc.includes("pool")) {
    items.push(makeItem("pool_resurface", lib, 1));
  }

  if (desc.includes("deck") || desc.includes("patio") || desc.includes("outdoor")) {
    items.push(makeItem("deck_patio", lib, 1));
  }

  if (desc.includes("hot tub") || desc.includes("spa")) {
    items.push(makeItem("hot_tub", lib, 1));
  }

  if (desc.includes("exterior") || desc.includes("curb")) {
    items.push(makeItem("exterior_paint", lib, 1));
  }

  const totalLow = items.reduce((s, i) => s + i.lowCost, 0);
  const totalHigh = items.reduce((s, i) => s + i.highCost, 0);
  const totalEst = items.reduce((s, i) => s + i.estimatedCost, 0);
  const maxTimeline = Math.max(...items.map((i) => i.timelineDays));

  return {
    propertyId: property.id,
    items,
    totalCapexLow: totalLow,
    totalCapexHigh: totalHigh,
    totalCapexEstimate: totalEst,
    timelineWeeks: Math.ceil(maxTimeline / 7) + 2,
    methodology: "ai-inferred",
  };
}

/**
 * Manual mode: user provides specific renovation items with quantities.
 */
export function calculateCustomRenovation(
  propertyId: string,
  customItems: Array<{ category: string; quantity: number }>
): RenovationEstimate {
  const lib = loadCostLibrary();
  const items = customItems.map((ci) => makeItem(ci.category, lib, ci.quantity));

  const totalLow = items.reduce((s, i) => s + i.lowCost, 0);
  const totalHigh = items.reduce((s, i) => s + i.highCost, 0);
  const totalEst = items.reduce((s, i) => s + i.estimatedCost, 0);
  const maxTimeline = items.length > 0 ? Math.max(...items.map((i) => i.timelineDays)) : 0;

  return {
    propertyId,
    items,
    totalCapexLow: totalLow,
    totalCapexHigh: totalHigh,
    totalCapexEstimate: totalEst,
    timelineWeeks: Math.ceil(maxTimeline / 7) + 1,
    methodology: "manual",
  };
}

export function getCostLibrary(): Record<string, CostLibraryItem> {
  return loadCostLibrary();
}
