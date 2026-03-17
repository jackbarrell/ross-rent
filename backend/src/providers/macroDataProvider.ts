import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MacroData } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../../../data/macro_data.json");

let cache: Record<string, MacroData> | null = null;

function loadData(): Record<string, MacroData> {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  }
  return cache!;
}

export function getMacroData(locationKey: string): MacroData | null {
  const data = loadData();
  return data[locationKey] ?? null;
}

export function getAllMacroLocations(): string[] {
  return Object.keys(loadData());
}
