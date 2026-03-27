import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PropertyListing, RentalComparable } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceRoot = path.resolve(__dirname, "../../../");
const dbDir = path.join(workspaceRoot, "backend", ".local");
const dbPath = path.join(dbDir, "ross_rent.sqlite");
const propertyPath = path.join(workspaceRoot, "data", "property_listings.json");
const compsPath = path.join(workspaceRoot, "data", "rental_comparables.json");

let _db: InstanceType<typeof Database> | null = null;

function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  _db = new Database(dbPath);
  // Always create deals table
  _db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      propertyId TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'watching',
      notes TEXT NOT NULL DEFAULT '',
      savedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  return _db;
}

export const initDatabase = () => {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL,
      bedrooms INTEGER NOT NULL,
      bathrooms REAL NOT NULL,
      sqft INTEGER NOT NULL,
      listPrice REAL NOT NULL,
      propertyType TEXT NOT NULL,
      daysOnMarket INTEGER NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      imageUrl TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS rental_comps (
      id TEXT PRIMARY KEY,
      locationKey TEXT NOT NULL,
      source TEXT NOT NULL,
      name TEXT NOT NULL,
      bedrooms INTEGER NOT NULL,
      bathrooms REAL NOT NULL,
      adr REAL NOT NULL,
      occupancyRate REAL NOT NULL,
      reviews INTEGER NOT NULL,
      distanceMiles REAL NOT NULL,
      propertyType TEXT NOT NULL
    );
  `);

  const propertyCount = db.prepare("SELECT COUNT(*) as count FROM properties").get() as { count: number };
  const compCount = db.prepare("SELECT COUNT(*) as count FROM rental_comps").get() as { count: number };

  if (propertyCount.count === 0) {
    const properties = JSON.parse(fs.readFileSync(propertyPath, "utf-8")) as PropertyListing[];
    const insertProperty = db.prepare(`
      INSERT INTO properties (
        id, address, city, state, zip, bedrooms, bathrooms, sqft, listPrice,
        propertyType, daysOnMarket, lat, lng, imageUrl, description
      ) VALUES (
        @id, @address, @city, @state, @zip, @bedrooms, @bathrooms, @sqft, @listPrice,
        @propertyType, @daysOnMarket, @lat, @lng, @imageUrl, @description
      )
    `);

    const transaction = db.transaction((rows: PropertyListing[]) => {
      for (const row of rows) {
        insertProperty.run(row);
      }
    });

    transaction(properties);
  }

  if (compCount.count === 0) {
    const comps = JSON.parse(fs.readFileSync(compsPath, "utf-8")) as RentalComparable[];
    const insertComp = db.prepare(`
      INSERT INTO rental_comps (
        id, locationKey, source, name, bedrooms, bathrooms, adr,
        occupancyRate, reviews, distanceMiles, propertyType
      ) VALUES (
        @id, @locationKey, @source, @name, @bedrooms, @bathrooms, @adr,
        @occupancyRate, @reviews, @distanceMiles, @propertyType
      )
    `);

    const transaction = db.transaction((rows: RentalComparable[]) => {
      for (const row of rows) {
        insertComp.run(row);
      }
    });

    transaction(comps);
  }

  // Clean up any bogus markets where city contains digits (street addresses)
  db.prepare("DELETE FROM properties WHERE city GLOB '*[0-9]*'").run();
  db.prepare("DELETE FROM rental_comps WHERE locationKey GLOB '*[0-9]*'").run();

  return db;
};

// ─── Market Management ─────────────────────────────────────

export function marketExists(city: string, state: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM properties WHERE LOWER(city) = LOWER(?) AND UPPER(state) = UPPER(?)").get(city, state) as { count: number };
  return row.count > 0;
}

export function insertProperties(properties: PropertyListing[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO properties (
      id, address, city, state, zip, bedrooms, bathrooms, sqft, listPrice,
      propertyType, daysOnMarket, lat, lng, imageUrl, description
    ) VALUES (
      @id, @address, @city, @state, @zip, @bedrooms, @bathrooms, @sqft, @listPrice,
      @propertyType, @daysOnMarket, @lat, @lng, @imageUrl, @description
    )
  `);
  const tx = db.transaction((rows: PropertyListing[]) => {
    for (const row of rows) {
      stmt.run({ ...row, imageUrl: row.imageUrl ?? null, description: row.description ?? null });
    }
  });
  tx(properties);
}

export function insertRentalComps(comps: RentalComparable[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO rental_comps (
      id, locationKey, source, name, bedrooms, bathrooms, adr,
      occupancyRate, reviews, distanceMiles, propertyType
    ) VALUES (
      @id, @locationKey, @source, @name, @bedrooms, @bathrooms, @adr,
      @occupancyRate, @reviews, @distanceMiles, @propertyType
    )
  `);
  const tx = db.transaction((rows: RentalComparable[]) => {
    for (const row of rows) stmt.run(row);
  });
  tx(comps);
}

export function removeMarket(city: string, state: string): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM properties WHERE LOWER(city) = LOWER(?) AND UPPER(state) = UPPER(?)").run(city, state);
  const locationKey = `${city},${state.toUpperCase()}`;
  db.prepare("DELETE FROM rental_comps WHERE locationKey = ?").run(locationKey);
  return result.changes;
}

// ─── Deal Pipeline (SQLite-persisted) ──────────────────────

import { DealStatus, SavedDeal } from "../models.js";

export function getAllDeals(): SavedDeal[] {
  const db = getDb();
  return db.prepare("SELECT propertyId, status, notes, savedAt, updatedAt FROM deals ORDER BY updatedAt DESC").all() as SavedDeal[];
}

export function upsertDeal(propertyId: string, status: DealStatus, notes: string): SavedDeal {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT savedAt FROM deals WHERE propertyId = ?").get(propertyId) as { savedAt: string } | undefined;
  const savedAt = existing?.savedAt ?? now;

  db.prepare(`
    INSERT INTO deals (propertyId, status, notes, savedAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(propertyId) DO UPDATE SET status = excluded.status, notes = excluded.notes, updatedAt = excluded.updatedAt
  `).run(propertyId, status, notes, savedAt, now);

  return { propertyId, status, notes, savedAt, updatedAt: now };
}

export function deleteDeal(propertyId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM deals WHERE propertyId = ?").run(propertyId);
}
