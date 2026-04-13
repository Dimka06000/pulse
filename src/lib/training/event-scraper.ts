// ── Event Scraper — Perplexity Sonar ──

export interface ScrapedEvent {
  name: string;
  date: string | null;
  sport: string;
  location: string;
  distanceKm: number | null;
  elevationM: number | null;
  terrainType: 'road' | 'trail' | 'mixed' | 'indoor' | 'water' | null;
  description: string;
  conditions: string;
  experienceReports: string[];
  sourceUrls: string[];
}

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans les événements sportifs. Extrais les informations suivantes de l'événement demandé au format JSON: name, date (YYYY-MM-DD), sport, location, distanceKm, elevationM, terrainType (road/trail/mixed/indoor/water), description, conditions (météo, altitude, difficulté), experienceReports (3-5 retours d'expérience d'athlètes). Réponds UNIQUEMENT en JSON valide.`;

function fallbackEvent(query: string): ScrapedEvent {
  return {
    name: query,
    date: null,
    sport: '',
    location: '',
    distanceKm: null,
    elevationM: null,
    terrainType: null,
    description: '',
    conditions: '',
    experienceReports: [],
    sourceUrls: [],
  };
}

export async function scrapeEvent(query: string): Promise<ScrapedEvent> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn('[event-scraper] PERPLEXITY_API_KEY not set, returning fallback');
    return fallbackEvent(query);
  }

  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`[event-scraper] Perplexity API ${res.status}: ${res.statusText}`);
      return fallbackEvent(query);
    }

    const data = await res.json();

    // Extract citations/sources
    const sourceUrls: string[] = Array.isArray(data.citations)
      ? data.citations
      : [];

    // Parse content
    const rawContent: string = data.choices?.[0]?.message?.content ?? '';

    // Strip markdown fences if present
    const jsonStr = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    const event: ScrapedEvent = {
      name: parsed.name ?? query,
      date: parsed.date ?? null,
      sport: parsed.sport ?? '',
      location: parsed.location ?? '',
      distanceKm: parsed.distanceKm ?? null,
      elevationM: parsed.elevationM ?? null,
      terrainType: ['road', 'trail', 'mixed', 'indoor', 'water'].includes(parsed.terrainType)
        ? parsed.terrainType
        : null,
      description: parsed.description ?? '',
      conditions: parsed.conditions ?? '',
      experienceReports: Array.isArray(parsed.experienceReports) ? parsed.experienceReports : [],
      sourceUrls,
    };

    return event;
  } catch (err) {
    console.error('[event-scraper] Failed to scrape event:', err);
    return fallbackEvent(query);
  }
}
