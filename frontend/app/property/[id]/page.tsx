import { PropertyDetail } from "./PropertyDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function generateStaticParams() {
  const cities = [
    { prefix: "prop-atx", count: 5 },
    { prefix: "prop-bna", count: 5 },
    { prefix: "prop-scf", count: 5 },
    { prefix: "prop-den", count: 5 },
    { prefix: "prop-tpa", count: 5 },
    { prefix: "prop-mvt", count: 5 },
  ];
  const params: Array<{ id: string }> = [];
  for (const c of cities) {
    for (let i = 1; i <= c.count; i++) {
      params.push({ id: `${c.prefix}-${String(i).padStart(3, "0")}` });
    }
  }
  return params;
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <PropertyDetail id={id} />
    </ErrorBoundary>
  );
}
