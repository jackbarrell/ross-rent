import {
  AnalysisAssumptions,
  ComparableSale,
  MacroData,
  OperationsSnapshot,
  PropertyListing,
  RentalComparable,
  ValuationResult,
} from "../models.js";

export interface ListingDataProvider {
  getLocations(): Promise<string[]>;
  searchProperties(location: string): Promise<PropertyListing[]>;
  getPropertyById(id: string): Promise<PropertyListing | null>;
}

export interface ShortTermRentalDataProvider {
  getComparables(locationKey: string): Promise<RentalComparable[]>;
  getAssumptions(locationKey: string): Promise<AnalysisAssumptions>;
}

export interface MacroDataProvider {
  getMacroData(locationKey: string): MacroData | null;
}

export interface OperationsDataProvider {
  getOperationsSnapshot(propertyId: string): OperationsSnapshot | null;
  getPropertyIdsWithBookings(): string[];
}

export interface ValuationProvider {
  getComparableSales(property: PropertyListing): ComparableSale[];
  estimatePostRenovationValue(property: PropertyListing, renovationCost: number): ValuationResult;
}
