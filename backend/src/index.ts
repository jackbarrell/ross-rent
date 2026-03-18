import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AnalysisEngine } from "./analysis/analysisEngine.js";
import { AiSummaryService } from "./ai/summary.js";
import { initDatabase } from "./db/sqlite.js";
import { MockListingProvider } from "./providers/mockListingProvider.js";
import { MockShortTermRentalProvider } from "./providers/mockStrProvider.js";
import { LiveListingProvider, LiveShortTermRentalProvider } from "./providers/liveProviders.js";
import { ListingDataProvider, ShortTermRentalDataProvider } from "./providers/interfaces.js";
import { createAnalysisRouter } from "./routes/analysis.js";
import { createPropertyRouter } from "./routes/properties.js";
import { createDataRouter } from "./routes/data.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const useMockData = (process.env.USE_MOCK_DATA ?? "true").toLowerCase() === "true";

app.use(cors({ origin: frontendOrigin === "*" ? true : frontendOrigin }));
app.use(express.json());

const db = useMockData ? initDatabase() : null;

const listingProvider: ListingDataProvider = useMockData
  ? new MockListingProvider(db!)
  : new LiveListingProvider();
const strProvider: ShortTermRentalDataProvider = useMockData
  ? new MockShortTermRentalProvider(db!)
  : new LiveShortTermRentalProvider();

const analysisEngine = new AnalysisEngine();
const aiSummaryService = new AiSummaryService(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL);

// ─── Routes ─────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: useMockData ? "mock" : "live" });
});

// Property + ranking + portfolio routes (parallelized)
const propertyRouter = createPropertyRouter(listingProvider, strProvider, analysisEngine);
app.use("/api", propertyRouter);

// Analysis routes (GET/POST /api/analysis/:propertyId)
const { router: analysisRouter, runAnalysis } = createAnalysisRouter(
  listingProvider, strProvider, analysisEngine, aiSummaryService, useMockData,
);
app.use("/api/analysis", analysisRouter);

// Data routes: macro, renovation, valuation, financial-model, memo, sensitivity, operations,
// accounting, forecast, deals, compare — all mounted at /api
const dataRouter = createDataRouter(listingProvider, strProvider, analysisEngine, runAnalysis, useMockData);
app.use("/api", dataRouter);

// ─── Serve frontend static build in production ────────────

const frontendOutDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../frontend/out"
);

if (fs.existsSync(frontendOutDir)) {
  app.use(express.static(frontendOutDir));
  // SPA fallback: serve index.html for any non-API route
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    const reqPath = _req.path.replace(/\/$/, "") || "/index";
    const htmlFile = path.join(frontendOutDir, `${reqPath}.html`);
    if (fs.existsSync(htmlFile)) {
      res.sendFile(htmlFile);
    } else {
      res.sendFile(path.join(frontendOutDir, "index.html"));
    }
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
