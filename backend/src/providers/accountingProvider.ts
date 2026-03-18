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

  const dates = entries.map((e) => e.date).sort();
  const period = dates.length > 0
    ? `${dates[0].substring(0, 7)} to ${dates[dates.length - 1].substring(0, 7)}`
    : "N/A";

  return {
    propertyId,
    address: addressLookup ? addressLookup(propertyId) : propertyId,
    period,
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

  const allDates = all.map((e) => e.date).sort();
  const period = allDates.length > 0
    ? `${allDates[0].substring(0, 7)} to ${allDates[allDates.length - 1].substring(0, 7)}`
    : "N/A";

  return {
    period,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    propertyCount: properties.length,
    properties,
  };
}
