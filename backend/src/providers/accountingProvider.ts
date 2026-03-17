import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AccountingEntry, CompanyPL, PropertyPL } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../../../data/accounting.json");

let cache: AccountingEntry[] | null = null;

function loadEntries(): AccountingEntry[] {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  }
  return cache!;
}

export function getPropertyPL(
  propertyId: string,
  addressLookup?: (id: string) => string
): PropertyPL {
  const entries = loadEntries().filter((e) => e.propertyId === propertyId);
  const income = entries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const expenses = entries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);

  return {
    propertyId,
    address: addressLookup ? addressLookup(propertyId) : propertyId,
    period: "2025-07 to 2025-12",
    totalIncome: income,
    totalExpenses: expenses,
    netIncome: income - expenses,
    entries,
  };
}

export function getCompanyPL(
  addressLookup?: (id: string) => string
): CompanyPL {
  const all = loadEntries();
  const propertyIds = [...new Set(all.map((e) => e.propertyId))];

  const properties = propertyIds.map((pid) => getPropertyPL(pid, addressLookup));
  const totalIncome = properties.reduce((s, p) => s + p.totalIncome, 0);
  const totalExpenses = properties.reduce((s, p) => s + p.totalExpenses, 0);

  return {
    period: "2025-07 to 2025-12",
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    propertyCount: properties.length,
    properties,
  };
}
