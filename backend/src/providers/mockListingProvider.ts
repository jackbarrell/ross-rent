import Database from "better-sqlite3";
import { PropertyListing } from "../models.js";
import { ListingDataProvider } from "./interfaces.js";

export class MockListingProvider implements ListingDataProvider {
  constructor(private readonly db: Database.Database) {}

  async getLocations(): Promise<string[]> {
    const rows = this.db
      .prepare("SELECT DISTINCT city || ',' || state as location FROM properties ORDER BY city ASC")
      .all() as Array<{ location: string }>;

    return rows.map((r) => r.location);
  }

  async searchProperties(location: string): Promise<PropertyListing[]> {
    const q = location.trim();
    if (!q) {
      return this.db.prepare("SELECT * FROM properties ORDER BY city ASC, listPrice ASC").all() as PropertyListing[];
    }

    // ZIP code search (5-digit)
    if (/^\d{5}$/.test(q)) {
      return this.db.prepare("SELECT * FROM properties WHERE zip = ? ORDER BY listPrice ASC").all(q) as PropertyListing[];
    }

    // City,State format (exactly 2 parts)
    if (q.includes(",")) {
      const parts = q.split(",").map((x) => x.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        const results = this.db
          .prepare("SELECT * FROM properties WHERE city = ? AND state = ? ORDER BY listPrice ASC")
          .all(parts[0], parts[1]) as PropertyListing[];
        if (results.length > 0) return results;
      }
      // Multi-part address like "4722 Randolph Rd, Morrisville, VT" — fall through to free-text
    }

    // Free-text: search city, state, zip, address, or full query across all fields
    const like = `%${q}%`;
    const words = q.split(/[\s,]+/).filter((w) => w.length >= 2);
    if (words.length > 1) {
      // Multi-word: match each word against any field for better address search
      const conditions = words.map(() => "(address LIKE ? OR city LIKE ? OR state LIKE ? OR zip LIKE ?)").join(" AND ");
      const params = words.flatMap((w) => { const l = `%${w}%`; return [l, l, l, l]; });
      const results = this.db
        .prepare(`SELECT * FROM properties WHERE ${conditions} ORDER BY listPrice ASC`)
        .all(...params) as PropertyListing[];
      if (results.length > 0) return results;
    }
    return this.db
      .prepare("SELECT * FROM properties WHERE city LIKE ? OR state LIKE ? OR zip LIKE ? OR address LIKE ? ORDER BY listPrice ASC")
      .all(like, like, like, like) as PropertyListing[];
  }

  async getPropertyById(id: string): Promise<PropertyListing | null> {
    const row = this.db.prepare("SELECT * FROM properties WHERE id = ?").get(id) as PropertyListing | undefined;
    return row ?? null;
  }
}
