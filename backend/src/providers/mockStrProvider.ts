import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisAssumptions, RentalComparable } from "../models.js";
import { ShortTermRentalDataProvider } from "./interfaces.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../../../");
const assumptionsPath = path.join(workspaceRoot, "data", "market_assumptions.json");

type RawAssumptions = {
  default: Omit<AnalysisAssumptions, "seasonalityIndex" | "monthlySeasonality" | "riskNotes">;
  locations: Record<string, { seasonalityIndex: number; monthlySeasonality?: number[]; riskNotes: string[] }>;
};

export class MockShortTermRentalProvider implements ShortTermRentalDataProvider {
  private readonly assumptions: RawAssumptions;

  constructor(private readonly db: Database.Database) {
    this.assumptions = JSON.parse(fs.readFileSync(assumptionsPath, "utf-8")) as RawAssumptions;
  }

  async getComparables(locationKey: string): Promise<RentalComparable[]> {
    const rows = this.db
      .prepare("SELECT * FROM rental_comps WHERE locationKey = ? ORDER BY adr DESC")
      .all(locationKey) as RentalComparable[];

    return rows;
  }

  async getAssumptions(locationKey: string): Promise<AnalysisAssumptions> {
    const locationSpecific = this.assumptions.locations[locationKey] ?? {
      seasonalityIndex: 1,
      riskNotes: ["Limited market-level risk metadata"]
    };

    return {
      ...this.assumptions.default,
      seasonalityIndex: locationSpecific.seasonalityIndex,
      monthlySeasonality: locationSpecific.monthlySeasonality,
      riskNotes: locationSpecific.riskNotes
    };
  }
}
