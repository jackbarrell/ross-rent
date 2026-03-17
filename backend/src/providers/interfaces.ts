import { AnalysisAssumptions, PropertyListing, RentalComparable } from "../models.js";

export interface ListingDataProvider {
  getLocations(): Promise<string[]>;
  searchProperties(location: string): Promise<PropertyListing[]>;
  getPropertyById(id: string): Promise<PropertyListing | null>;
}

export interface ShortTermRentalDataProvider {
  getComparables(locationKey: string): Promise<RentalComparable[]>;
  getAssumptions(locationKey: string): Promise<AnalysisAssumptions>;
}
