import Link from "next/link";
import { PropertyListing } from "@/lib/types";

export function PropertyCard({ property }: { property: PropertyListing }) {
  return (
    <Link href={`/property/${property.id}`} className="card linkCard">
      <div className="cardHeader">
        <h3>{property.address}</h3>
        <span className="pill">{property.propertyType}</span>
      </div>
      <p className="cardLocation">{property.city}, {property.state} {property.zip}</p>
      <p className="cardSpecs">{property.bedrooms} bd · {property.bathrooms} ba · {property.sqft.toLocaleString()} sqft</p>
      <div className="cardFooter">
        <strong>${property.listPrice.toLocaleString()}</strong>
        <span>{property.daysOnMarket} DOM</span>
      </div>
    </Link>
  );
}
