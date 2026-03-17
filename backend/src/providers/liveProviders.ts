import { AnalysisAssumptions, PropertyListing, RentalComparable } from "../models.js";
import { ListingDataProvider, ShortTermRentalDataProvider } from "./interfaces.js";

// Placeholder providers. In production, these classes would call real MLS / STR APIs.
export class LiveListingProvider implements ListingDataProvider {
  async getLocations(): Promise<string[]> {
    throw new Error("LiveListingProvider not configured. Use mock provider for PoC mode.");
  }

  async searchProperties(_location: string): Promise<PropertyListing[]> {
    throw new Error("LiveListingProvider not configured. Use mock provider for PoC mode.");
  }

  async getPropertyById(_id: string): Promise<PropertyListing | null> {
    throw new Error("LiveListingProvider not configured. Use mock provider for PoC mode.");
  }
}

export class LiveShortTermRentalProvider implements ShortTermRentalDataProvider {
  async getComparables(_locationKey: string): Promise<RentalComparable[]> {
    throw new Error("LiveShortTermRentalProvider not configured. Use mock provider for PoC mode.");
  }

  async getAssumptions(_locationKey: string): Promise<AnalysisAssumptions> {
    throw new Error("LiveShortTermRentalProvider not configured. Use mock provider for PoC mode.");
  }
}
