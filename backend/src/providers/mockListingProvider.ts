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

    // City,State format
    if (q.includes(",")) {
      const [city, state] = q.split(",").map((x) => x.trim());
      if (city && state) {
        return this.db
          .prepare("SELECT * FROM properties WHERE city = ? AND state = ? ORDER BY listPrice ASC")
          .all(city, state) as PropertyListing[];
      }
    }

    // Free-text: search city, state, zip, address
    const like = `%${q}%`;
    return this.db
      .prepare("SELECT * FROM properties WHERE city LIKE ? OR state LIKE ? OR zip LIKE ? OR address LIKE ? ORDER BY listPrice ASC")
      .all(like, like, like, like) as PropertyListing[];
  }

  async getPropertyById(id: string): Promise<PropertyListing | null> {
    const row = this.db.prepare("SELECT * FROM properties WHERE id = ?").get(id) as PropertyListing | undefined;
    return row ?? null;
  }
}
