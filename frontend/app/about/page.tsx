import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About – RossRent AI-Powered STR Platform",
  description: "Learn how RossRent covers the full short-term rental investment lifecycle",
};

const PHASES = [
  {
    phase: "Phase 1 — Acquisition & Due Diligence",
    steps: [
      {
        number: "01",
        title: "Property Sourcing",
        description:
          "Search for-sale residential properties across any US market. Filter by city, ZIP code, or address. View centralised inventory with key property details — bedrooms, bathrooms, square footage, list price, and days on market.",
        tags: ["MLS-style data", "RentCast API", "15 demo properties"],
      },
      {
        number: "02",
        title: "STR Market Analysis",
        description:
          "Pull Airbnb and Vrbo rental comparables for the target market. Determine estimated ADR (average daily rate), occupancy rate, review count, and market attractiveness. Revenue is computed monthly using per-market seasonality curves — not flat annual averages.",
        tags: ["Mashvisor API", "Monthly seasonality", "Confidence scoring"],
      },
      {
        number: "03",
        title: "Macro & Location Analysis",
        description:
          "Assess the investment location using economic fundamentals — population growth, GDP proxy, tourism demand index, unemployment rate, median home price, home price appreciation, crime index, and WalkScore. Data sourced from FRED (Federal Reserve) and WalkScore APIs.",
        tags: ["FRED API", "WalkScore API", "Economic trend scoring"],
      },
      {
        number: "04",
        title: "Renovation Modelling",
        description:
          "Automatically infer renovation scope from the property description using keyword analysis, or manually specify work items. Uses a 17-category cost database covering kitchens, bathrooms, HVAC, flooring, furnishing, landscaping, pools, and more. Outputs total CAPEX range and timeline in weeks.",
        tags: ["Cost library", "Description analysis", "Manual override"],
      },
      {
        number: "05",
        title: "Post-Renovation Valuation",
        description:
          "Estimate the after-renovation value using comparable sales filtered by location, bed/bath count (±1), square footage (±40%), and recency-weighted pricing. Calculates equity created and refinance potential.",
        tags: ["Comparable sales", "Recency weighting", "Equity analysis"],
      },
      {
        number: "06",
        title: "Financial Modelling",
        description:
          "Build a 5-year forward projection including mortgage, refinance at year 3, operating income, and capital appreciation. Uses Newton-Raphson IRR solver for true internal rate of return. Growth rates for revenue, costs, and appreciation are fully configurable.",
        tags: ["5-year P&L", "Newton-Raphson IRR", "Refinance scenario"],
      },
      {
        number: "07",
        title: "Investment Memo",
        description:
          "Generate a structured investment memo covering property overview, market analysis, financial projections, renovation plan, valuation, risk factors, and recommendation. Exportable as Markdown. Optionally powered by OpenAI for narrative generation.",
        tags: ["Markdown export", "AI-enhanced", "Structured sections"],
      },
    ],
  },
  {
    phase: "Phase 2 — Operations & Performance",
    steps: [
      {
        number: "08",
        title: "Booking Data Ingestion",
        description:
          "Ingest booking records from Airbnb and Vrbo channels. Track check-in/check-out dates, nightly revenue, guest information, and booking source. View monthly breakdown of bookings, nights, revenue, ADR, and occupancy.",
        tags: ["PMS integration", "Monthly breakdown", "Multi-channel"],
      },
      {
        number: "09",
        title: "Forecast vs Actual",
        description:
          "Compare projected performance against actual operations data. Quantify error for ADR, occupancy, and revenue. The system generates concrete calibrated assumption adjustments — not just suggestions — to improve future projections.",
        tags: ["Variance analysis", "AI explanation", "Assumption calibration"],
      },
      {
        number: "10",
        title: "Accounting Integration",
        description:
          "Pull real income and expense data from accounting systems. View property-level P&L with categorised entries — rental income, cleaning, maintenance, utilities, insurance, and more. All entries are timestamped and auditable.",
        tags: ["QuickBooks-style", "Property P&L", "Expense categories"],
      },
      {
        number: "11",
        title: "Company-Level Financials",
        description:
          "Aggregate performance across the entire portfolio. View total portfolio value, combined estimated revenue and NOI, average yield, and attractiveness scores. Track which properties have live operations data.",
        tags: ["Portfolio dashboard", "Company P&L", "Cross-property aggregation"],
      },
    ],
  },
];

const TECH_PILLARS = [
  {
    title: "API-Driven Architecture",
    description:
      "Every data source is abstracted behind provider interfaces. Swap mock data for live APIs (RentCast, Mashvisor, FRED, WalkScore) by changing a single environment variable. No frontend changes required.",
  },
  {
    title: "Deterministic Financial Logic",
    description:
      "All financial calculations — ADR, occupancy, revenue, NOI, IRR, mortgage amortisation — use explicit, traceable formulas. AI is never used for core financial math.",
  },
  {
    title: "Thin AI Layer",
    description:
      "AI is used only where it adds value: renovation scope inference from property descriptions, investment memo narrative generation, and explaining forecast-vs-actual variance. Every AI output has a deterministic fallback.",
  },
  {
    title: "Unified Data Flow",
    description:
      "Data flows through the lifecycle as a connected system — property sourcing feeds analysis, which feeds renovation modelling, which feeds valuation and financial modelling, which generates the investment memo. Operations data flows back to calibrate forecasts.",
  },
];

export default function AboutPage() {
  return (
    <div className="pageStack fadeIn">
      <header className="hero">
        <h1>The Complete STR Investment Engine</h1>
        <p>
          RossRent covers the full lifecycle of a short-term rental investment — from finding
          properties and building the financial case, through operations and performance tracking,
          to improving future decisions. One system, not disconnected tools.
        </p>
        <div className="heroStats">
          <div className="heroStat">
            <span className="heroStatValue">11</span>
            <span className="heroStatLabel">Lifecycle Steps</span>
          </div>
          <div className="heroStat">
            <span className="heroStatValue">13</span>
            <span className="heroStatLabel">AI Models</span>
          </div>
          <div className="heroStat">
            <span className="heroStatValue">7</span>
            <span className="heroStatLabel">Data Sources</span>
          </div>
          <div className="heroStat">
            <span className="heroStatValue">5yr</span>
            <span className="heroStatLabel">Forecast Horizon</span>
          </div>
        </div>
      </header>

      {/* Demo Walkthrough */}
      <section className="aiPanel">
        <h3><span className="pillAi" style={{ marginRight: 6 }}>DEMO</span> Quick Walkthrough</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
          <div className="panel" style={{ padding: "16px 18px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>1. Search a Market</h3>
            <p className="hintText" style={{ margin: 0 }}>Try &ldquo;Morrisville, VT&rdquo; or &ldquo;Austin, TX&rdquo; — see AI-scored property cards with deal grades.</p>
          </div>
          <div className="panel" style={{ padding: "16px 18px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>2. Dive into a Property</h3>
            <p className="hintText" style={{ margin: 0 }}>Click any card to see 13 analysis tabs — from STR comps to Monte Carlo to AI memo.</p>
          </div>
          <div className="panel" style={{ padding: "16px 18px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>3. Run Scenarios</h3>
            <p className="hintText" style={{ margin: 0 }}>Adjust renovation budget, fees, and rates — recalculate the full model in real-time.</p>
          </div>
          <div className="panel" style={{ padding: "16px 18px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "0.9rem" }}>4. Compare &amp; Decide</h3>
            <p className="hintText" style={{ margin: 0 }}>Use Compare, Markets, and Portfolio views to evaluate across properties.</p>
          </div>
        </div>
      </section>

      {/* Lifecycle stages */}
      {PHASES.map((phase) => (
        <section key={phase.phase}>
          <h2 className="phaseHeading">{phase.phase}</h2>
          <div className="aboutGrid">
            {phase.steps.map((step) => (
              <div key={step.number} className="aboutCard panel">
                <div className="aboutCardNumber">{step.number}</div>
                <h3>{step.title}</h3>
                <p className="hintText">{step.description}</p>
                <div className="aboutTags">
                  {step.tags.map((tag) => (
                    <span key={tag} className="aboutTag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Architecture pillars */}
      <section>
        <h2 className="phaseHeading">Architecture & Principles</h2>
        <div className="aboutGrid aboutGridWide">
          {TECH_PILLARS.map((pillar) => (
            <div key={pillar.title} className="aboutCard panel">
              <h3>{pillar.title}</h3>
              <p className="hintText">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API ecosystem */}
      <section className="panel" style={{ padding: "28px 24px" }}>
        <h2>Live API Ecosystem</h2>
        <p className="hintText" style={{ marginBottom: 16 }}>
          The system supports both demo mode (mock data) and live mode with real API integrations.
          Set <code style={{ color: "var(--accent)" }}>USE_MOCK_DATA=false</code> to activate.
        </p>
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Data Source</th>
                <th>Provider</th>
                <th>What It Provides</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cellBold">Property Listings</td>
                <td>RentCast API</td>
                <td>For-sale properties in any US market</td>
                <td><span className="pillAi">Live</span></td>
              </tr>
              <tr>
                <td className="cellBold">STR Comparables</td>
                <td>Mashvisor API</td>
                <td>Airbnb/Vrbo ADR, occupancy, reviews</td>
                <td><span className="pillAi">Live</span></td>
              </tr>
              <tr>
                <td className="cellBold">Economic Data</td>
                <td>FRED (Federal Reserve)</td>
                <td>Unemployment, home prices, appreciation</td>
                <td><span className="pillAi">Live</span></td>
              </tr>
              <tr>
                <td className="cellBold">Walkability</td>
                <td>WalkScore API</td>
                <td>Walk, transit, and bike scores</td>
                <td><span className="pillAi">Live</span></td>
              </tr>
              <tr>
                <td className="cellBold">Comparable Sales</td>
                <td>Local data</td>
                <td>Renovated/original sale comps by location</td>
                <td><span className="pillSmall">Mock</span></td>
              </tr>
              <tr>
                <td className="cellBold">Bookings / PMS</td>
                <td>Local data</td>
                <td>Airbnb/Vrbo booking records</td>
                <td><span className="pillSmall">Mock</span></td>
              </tr>
              <tr>
                <td className="cellBold">Accounting</td>
                <td>Local data</td>
                <td>Income/expense entries by property</td>
                <td><span className="pillSmall">Mock</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
