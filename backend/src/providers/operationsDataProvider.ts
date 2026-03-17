import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BookingRecord, MonthlyOperations, OperationsSnapshot } from "../models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, "../../../data/bookings.json");

let cache: BookingRecord[] | null = null;

function loadBookings(): BookingRecord[] {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  }
  return cache!;
}

export function getBookingsForProperty(propertyId: string): BookingRecord[] {
  return loadBookings().filter((b) => b.propertyId === propertyId);
}

export function getOperationsSnapshot(propertyId: string): OperationsSnapshot | null {
  const bookings = getBookingsForProperty(propertyId);
  if (bookings.length === 0) return null;

  // Group by month
  const monthMap = new Map<string, BookingRecord[]>();
  for (const b of bookings) {
    const month = b.checkIn.substring(0, 7); // YYYY-MM
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(b);
  }

  const monthlyBreakdown: MonthlyOperations[] = [];
  for (const [month, bks] of Array.from(monthMap.entries()).sort()) {
    const nights = bks.reduce((s, b) => s + b.nights, 0);
    const revenue = bks.reduce((s, b) => s + b.revenue, 0);
    const adr = nights > 0 ? Math.round((revenue / nights) * 100) / 100 : 0;
    const daysInMonth = new Date(
      Number(month.split("-")[0]),
      Number(month.split("-")[1]),
      0
    ).getDate();
    const occupancy = Math.round((nights / daysInMonth) * 1000) / 1000;

    monthlyBreakdown.push({
      month,
      bookings: bks.length,
      nights,
      revenue,
      adr,
      occupancy,
    });
  }

  const totalNights = bookings.reduce((s, b) => s + b.nights, 0);
  const totalRevenue = bookings.reduce((s, b) => s + b.revenue, 0);
  const totalAdr = totalNights > 0 ? Math.round((totalRevenue / totalNights) * 100) / 100 : 0;

  // Total days in tracked period
  const months = monthlyBreakdown.length;
  const totalDays = months * 30; // simplified
  const totalOccupancy = Math.round((totalNights / totalDays) * 1000) / 1000;

  const dates = bookings.map((b) => b.checkIn).sort();
  const period = `${dates[0]} to ${bookings.map((b) => b.checkOut).sort().pop()}`;

  return {
    propertyId,
    period,
    totalBookings: bookings.length,
    totalNights,
    totalRevenue,
    actualAdr: totalAdr,
    actualOccupancy: totalOccupancy,
    monthlyBreakdown,
  };
}

export function getPropertyIdsWithBookings(): string[] {
  const bookings = loadBookings();
  return [...new Set(bookings.map((b) => b.propertyId))];
}
