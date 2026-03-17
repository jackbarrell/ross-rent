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

export const initDatabase = () => {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);

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

  return db;
};
