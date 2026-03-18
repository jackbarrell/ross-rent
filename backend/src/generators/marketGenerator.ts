import { PropertyListing, RentalComparable } from "../models.js";

// ─── City → State lookup for common US cities ──────────────

const CITY_STATE_MAP: Record<string, string> = {
  "new york": "NY", "los angeles": "CA", "chicago": "IL", "houston": "TX",
  "phoenix": "AZ", "philadelphia": "PA", "san antonio": "TX", "san diego": "CA",
  "dallas": "TX", "san jose": "CA", "austin": "TX", "jacksonville": "FL",
  "fort worth": "TX", "columbus": "OH", "charlotte": "NC", "indianapolis": "IN",
  "san francisco": "CA", "seattle": "WA", "denver": "CO", "nashville": "TN",
  "oklahoma city": "OK", "el paso": "TX", "boston": "MA", "portland": "OR",
  "las vegas": "NV", "memphis": "TN", "louisville": "KY", "baltimore": "MD",
  "milwaukee": "WI", "albuquerque": "NM", "tucson": "AZ", "fresno": "CA",
  "sacramento": "CA", "mesa": "AZ", "kansas city": "MO", "atlanta": "GA",
  "omaha": "NE", "colorado springs": "CO", "raleigh": "NC", "long beach": "CA",
  "virginia beach": "VA", "miami": "FL", "oakland": "CA", "minneapolis": "MN",
  "tampa": "FL", "tulsa": "OK", "arlington": "TX", "new orleans": "LA",
  "cleveland": "OH", "honolulu": "HI", "anaheim": "CA", "orlando": "FL",
  "st. louis": "MO", "saint louis": "MO", "pittsburgh": "PA", "cincinnati": "OH",
  "greensboro": "NC", "plano": "TX", "lincoln": "NE", "scottsdale": "AZ",
  "savannah": "GA", "charleston": "SC", "boise": "ID", "richmond": "VA",
  "salt lake city": "UT", "birmingham": "AL", "rochester": "NY",
  "des moines": "IA", "chattanooga": "TN", "knoxville": "TN", "asheville": "NC",
  "wilmington": "NC", "detroit": "MI", "madison": "WI", "durham": "NC",
  "st. petersburg": "FL", "fort lauderdale": "FL", "west palm beach": "FL",
  "naples": "FL", "sarasota": "FL", "key west": "FL", "gatlinburg": "TN",
  "pigeon forge": "TN", "sedona": "AZ", "park city": "UT", "aspen": "CO",
  "santa fe": "NM", "bend": "OR", "maui": "HI", "myrtle beach": "SC",
  "destin": "FL", "gulf shores": "AL", "panama city beach": "FL",
  "hilton head": "SC", "cape coral": "FL", "kissimmee": "FL",
  "big bear": "CA", "lake tahoe": "CA", "palm springs": "CA",
  "joshua tree": "CA", "galveston": "TX", "south padre island": "TX",
  "broken bow": "OK", "blue ridge": "GA", "helen": "GA",
  "branson": "MO", "hot springs": "AR",
};

export function resolveState(city: string): string | null {
  return CITY_STATE_MAP[city.toLowerCase().trim()] ?? null;
}

// ─── Regional pricing tiers ────────────────────────────────

const PRICING: Record<string, { minPrice: number; maxPrice: number; adrRange: [number, number]; occupancy: [number, number] }> = {
  PREMIUM: { minPrice: 550000, maxPrice: 1100000, adrRange: [280, 500], occupancy: [0.62, 0.78] },
  HIGH:    { minPrice: 380000, maxPrice: 720000,  adrRange: [200, 380], occupancy: [0.65, 0.80] },
  MID:     { minPrice: 280000, maxPrice: 520000,  adrRange: [150, 280], occupancy: [0.68, 0.82] },
  VALUE:   { minPrice: 160000, maxPrice: 350000,  adrRange: [110, 210], occupancy: [0.60, 0.76] },
};

const STATE_TIER: Record<string, keyof typeof PRICING> = {
  CA: "PREMIUM", NY: "PREMIUM", MA: "PREMIUM", HI: "PREMIUM", CT: "PREMIUM", NJ: "PREMIUM",
  CO: "HIGH", WA: "HIGH", OR: "HIGH", FL: "HIGH", TX: "HIGH", TN: "HIGH", AZ: "HIGH",
  GA: "HIGH", NC: "HIGH", VA: "HIGH", MD: "HIGH", IL: "HIGH", UT: "HIGH", SC: "HIGH",
  NV: "MID", NM: "MID", ID: "MID", MN: "MID", WI: "MID", PA: "MID", LA: "MID", MO: "MID",
  NE: "MID", IA: "MID", KY: "MID",
  // Everything else is VALUE
};

function getTier(state: string): keyof typeof PRICING {
  return STATE_TIER[state.toUpperCase()] ?? "VALUE";
}

// ─── Street name generator ─────────────────────────────────

const STREET_NAMES = [
  "Main St", "Oak Ave", "Elm St", "Park Blvd", "Lake Dr", "Maple Ln",
  "Cedar Rd", "Pine St", "Walnut Ave", "Birch Dr", "Sunset Blvd",
  "Highland Ave", "River Rd", "Spring St", "Meadow Ln", "Forest Dr",
  "Church St", "Mill Rd", "Valley View Dr", "Hillcrest Ave",
  "Washington St", "Jefferson Ave", "Lincoln Blvd", "Franklin St",
  "Madison Ave", "Monroe St", "Adams Rd", "Jackson St",
  "1st Ave", "2nd St", "3rd Ave", "4th St", "5th Ave", "6th St",
  "7th Ave", "8th St", "9th Ave", "10th St",
];

const PROPERTY_TYPES = ["Single Family", "Condo", "Townhome"];
const SOURCES: Array<"Airbnb" | "Vrbo"> = ["Airbnb", "Vrbo"];
const COMP_NAMES_PREFIX = [
  "Cozy", "Modern", "Charming", "Stylish", "Bright", "Spacious",
  "Downtown", "Sunny", "Luxury", "Updated", "Renovated", "Central",
];
const COMP_NAMES_SUFFIX = [
  "Retreat", "Getaway", "Hideaway", "Oasis", "Escape", "Haven",
  "Nest", "Suite", "Studio", "Loft", "Bungalow", "Cottage",
];

// ─── Seeded pseudo-random for deterministic output ─────────

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

function randBetween(rng: () => number, min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Approximate city center coordinates ───────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  // Major cities
  "new york,ny": [40.7128, -74.0060], "los angeles,ca": [34.0522, -118.2437],
  "chicago,il": [41.8781, -87.6298], "houston,tx": [29.7604, -95.3698],
  "phoenix,az": [33.4484, -112.0740], "san antonio,tx": [29.4241, -98.4936],
  "san diego,ca": [32.7157, -117.1611], "dallas,tx": [32.7767, -96.7970],
  "austin,tx": [30.2672, -97.7431], "jacksonville,fl": [30.3322, -81.6557],
  "san francisco,ca": [37.7749, -122.4194], "seattle,wa": [47.6062, -122.3321],
  "denver,co": [39.7392, -104.9903], "nashville,tn": [36.1627, -86.7816],
  "miami,fl": [25.7617, -80.1918], "atlanta,ga": [33.7490, -84.3880],
  "tampa,fl": [27.9506, -82.4572], "orlando,fl": [28.5383, -81.3792],
  "las vegas,nv": [36.1699, -115.1398], "portland,or": [45.5152, -122.6784],
  "scottsdale,az": [33.4942, -111.9261], "charleston,sc": [32.7765, -79.9311],
  "savannah,ga": [32.0809, -81.0912], "asheville,nc": [35.5951, -82.5515],
  "boise,id": [43.6150, -116.2023], "salt lake city,ut": [40.7608, -111.8910],
  "new orleans,la": [29.9511, -90.0715], "charlotte,nc": [35.2271, -80.8431],
  "raleigh,nc": [35.7796, -78.6382], "richmond,va": [37.5407, -77.4360],
  "boston,ma": [42.3601, -71.0589], "minneapolis,mn": [44.9778, -93.2650],
  "kansas city,mo": [39.0997, -94.5786], "st. louis,mo": [38.6270, -90.1994],
  "fort lauderdale,fl": [26.1224, -80.1373], "sarasota,fl": [27.3364, -82.5307],
  "naples,fl": [26.1420, -81.7948], "palm springs,ca": [33.8303, -116.5453],
  "sedona,az": [34.8697, -111.7610], "park city,ut": [40.6461, -111.4980],
  "gatlinburg,tn": [35.7143, -83.5102], "myrtle beach,sc": [33.6891, -78.8867],
  "destin,fl": [30.3935, -86.4958], "hilton head,sc": [32.2163, -80.7526],
  "galveston,tx": [29.3013, -94.7977], "key west,fl": [24.5551, -81.7800],
  "bend,or": [44.0582, -121.3153], "big bear,ca": [34.2439, -116.9114],
};

function getCityCoords(city: string, state: string): [number, number] {
  const key = `${city.toLowerCase()},${state.toLowerCase()}`;
  if (CITY_COORDS[key]) return CITY_COORDS[key];

  // Fallback: approximate by state center
  const STATE_CENTERS: Record<string, [number, number]> = {
    AL: [32.8, -86.8], AK: [64.2, -152.5], AZ: [34.0, -111.1], AR: [34.8, -92.2],
    CA: [36.8, -119.4], CO: [39.0, -105.8], CT: [41.6, -72.7], DE: [39.0, -75.5],
    FL: [27.6, -81.5], GA: [32.2, -83.4], HI: [19.9, -155.6], ID: [44.1, -114.7],
    IL: [40.3, -89.0], IN: [40.3, -86.1], IA: [42.0, -93.2], KS: [38.5, -98.8],
    KY: [37.8, -84.3], LA: [30.4, -91.2], ME: [45.4, -69.4], MD: [39.0, -76.6],
    MA: [42.4, -71.4], MI: [44.3, -84.5], MN: [46.4, -94.7], MS: [32.7, -89.4],
    MO: [38.6, -92.6], MT: [46.8, -110.4], NE: [41.1, -98.3], NV: [38.8, -116.4],
    NH: [43.2, -71.6], NJ: [40.1, -74.5], NM: [34.8, -106.2], NY: [43.0, -75.0],
    NC: [35.6, -79.0], ND: [47.5, -99.8], OH: [40.4, -83.0], OK: [35.0, -97.1],
    OR: [43.8, -120.6], PA: [41.2, -77.2], RI: [41.6, -71.5], SC: [34.0, -81.2],
    SD: [44.3, -99.4], TN: [35.5, -86.0], TX: [31.0, -97.6], UT: [39.3, -111.7],
    VT: [44.6, -72.6], VA: [37.4, -79.7], WA: [47.8, -120.7], WV: [38.6, -80.6],
    WI: [43.8, -88.8], WY: [43.1, -107.6],
  };
  return STATE_CENTERS[state.toUpperCase()] ?? [39.8, -98.6]; // US center fallback
}

// ─── ZIP code generation (plausible for area) ──────────────

const STATE_ZIP_PREFIXES: Record<string, string[]> = {
  AL: ["350", "351", "360"], AZ: ["850", "852", "853"], AR: ["716", "717", "720"],
  CA: ["900", "902", "910", "917", "920", "930", "940", "950"],
  CO: ["800", "802", "803"], CT: ["060", "061"],
  FL: ["320", "327", "328", "330", "331", "332", "334", "337", "339"],
  GA: ["300", "301", "310", "312"], HI: ["967", "968"], ID: ["836", "837"],
  IL: ["600", "601", "606"], IN: ["460", "461", "462"], IA: ["500", "501", "503"],
  KS: ["660", "661", "662"], KY: ["400", "401", "410"], LA: ["700", "701", "710"],
  ME: ["040", "041"], MD: ["210", "211", "212"], MA: ["010", "011", "020", "021"],
  MI: ["480", "481", "488", "490"], MN: ["550", "551", "553"],
  MS: ["390", "391", "392"], MO: ["630", "631", "640", "641"],
  NE: ["680", "681"], NV: ["890", "891"], NJ: ["070", "071", "080", "081"],
  NM: ["870", "871", "873"],
  NY: ["100", "101", "102", "110", "112", "130", "140"],
  NC: ["270", "272", "275", "277", "280", "283", "285"],
  OH: ["430", "432", "440", "441", "450", "452"], OK: ["730", "731", "740", "741"],
  OR: ["970", "971", "972", "973"], PA: ["150", "151", "170", "171", "190", "191"],
  SC: ["290", "293", "294", "295"], TN: ["370", "371", "372", "373", "377", "378", "379"],
  TX: ["750", "752", "760", "770", "773", "780", "782", "787", "789"],
  UT: ["840", "841", "843", "844"], VA: ["220", "221", "222", "230", "231", "232"],
  WA: ["980", "981", "982", "983", "984", "985"], WI: ["530", "531", "532", "535", "537"],
  WY: ["820", "822", "823"],
};

function generateZip(rng: () => number, state: string): string {
  const prefixes = STATE_ZIP_PREFIXES[state.toUpperCase()];
  if (!prefixes) return `${randBetween(rng, 10000, 99999)}`;
  const prefix = pick(rng, prefixes);
  const suffix = String(randBetween(rng, 10, 99));
  return `${prefix}${suffix}`;
}

// ─── Main generators ───────────────────────────────────────

function makePropertyId(city: string, state: string, idx: number): string {
  const prefix = city.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  const stLower = state.toLowerCase();
  return `prop-${prefix}${stLower}-${String(idx + 1).padStart(3, "0")}`;
}

export function generateProperties(city: string, state: string, count = 5): PropertyListing[] {
  const rng = seededRandom(`${city}-${state}-properties`);
  const tier = PRICING[getTier(state)];
  const [baseLat, baseLng] = getCityCoords(city, state);

  const properties: PropertyListing[] = [];
  const usedStreets = new Set<string>();

  for (let i = 0; i < count; i++) {
    let street: string;
    do {
      const num = randBetween(rng, 100, 9900);
      street = `${num} ${pick(rng, STREET_NAMES)}`;
    } while (usedStreets.has(street));
    usedStreets.add(street);

    const beds = pick(rng, [2, 3, 3, 3, 4, 4, 5]);
    const baths = beds <= 2 ? pick(rng, [1, 1.5, 2]) : pick(rng, [2, 2.5, 3, 3.5]);
    const sqft = randBetween(rng, beds * 350, beds * 550 + 400);
    const price = randBetween(rng, tier.minPrice, tier.maxPrice);

    properties.push({
      id: makePropertyId(city, state, i),
      address: street,
      city,
      state: state.toUpperCase(),
      zip: generateZip(rng, state),
      bedrooms: beds,
      bathrooms: baths,
      sqft,
      listPrice: Math.round(price / 1000) * 1000, // round to nearest $1k
      propertyType: pick(rng, PROPERTY_TYPES),
      daysOnMarket: randBetween(rng, 2, 90),
      lat: baseLat + (rng() - 0.5) * 0.04,
      lng: baseLng + (rng() - 0.5) * 0.04,
      imageUrl: undefined,
      description: undefined,
    });
  }

  return properties;
}

export function generateRentalComps(city: string, state: string, count = 6): RentalComparable[] {
  const rng = seededRandom(`${city}-${state}-comps`);
  const tier = PRICING[getTier(state)];
  const comps: RentalComparable[] = [];

  const prefix = city.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3);
  const stLower = state.toLowerCase();

  for (let i = 0; i < count; i++) {
    const beds = pick(rng, [2, 3, 3, 4, 4]);
    const baths = beds <= 2 ? pick(rng, [1, 2]) : pick(rng, [2, 2.5, 3]);
    const adr = randBetween(rng, tier.adrRange[0], tier.adrRange[1]);
    const occupancy = (randBetween(rng, tier.occupancy[0] * 100, tier.occupancy[1] * 100)) / 100;
    const namePrefix = pick(rng, COMP_NAMES_PREFIX);
    const nameSuffix = pick(rng, COMP_NAMES_SUFFIX);

    comps.push({
      id: `comp-${prefix}${stLower}-${String(i + 1).padStart(3, "0")}`,
      locationKey: `${city},${state.toUpperCase()}`,
      source: pick(rng, SOURCES),
      name: `${namePrefix} ${beds}BR ${nameSuffix}`,
      bedrooms: beds,
      bathrooms: baths,
      adr,
      occupancyRate: occupancy,
      reviews: randBetween(rng, 8, 320),
      distanceMiles: Math.round(rng() * 5 * 10) / 10,
      propertyType: "Entire home",
    });
  }

  return comps;
}
