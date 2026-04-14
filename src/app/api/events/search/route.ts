import { NextRequest, NextResponse } from 'next/server';
import { scrapeEvent } from '@/lib/training/event-scraper';

// Popular sporting events database for instant autocomplete
const POPULAR_EVENTS = [
  // Marathons
  { name: 'Marathon de Paris', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Paris, France', date: '2027-04-11' },
  { name: 'Marathon de Lyon', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Lyon, France', date: '2026-10-04' },
  { name: 'Marathon de Marseille', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Marseille, France', date: '2026-10-25' },
  { name: 'Marathon de Bordeaux', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Bordeaux, France', date: '2026-04-19' },
  { name: 'Marathon de Nice-Cannes', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Nice, France', date: '2026-11-08' },
  { name: 'Marathon de Toulouse', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Toulouse, France', date: '2026-10-25' },
  { name: 'Marathon de New York', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'New York, USA', date: '2026-11-01' },
  { name: 'Marathon de Berlin', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Berlin, Allemagne', date: '2026-09-27' },
  { name: 'Marathon de Londres', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Londres, UK', date: '2026-04-26' },
  { name: 'Marathon de Chicago', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Chicago, USA', date: '2026-10-11' },
  { name: 'Marathon de Tokyo', sport: 'running', distanceKm: 42.195, terrainType: 'road' as const, location: 'Tokyo, Japon', date: '2027-03-07' },
  // Semi-marathons
  { name: 'Semi-Marathon de Paris', sport: 'running', distanceKm: 21.1, terrainType: 'road' as const, location: 'Paris, France', date: '2027-03-07' },
  { name: 'Semi-Marathon de Boulogne-Billancourt', sport: 'running', distanceKm: 21.1, terrainType: 'road' as const, location: 'Boulogne, France', date: '2026-11-22' },
  // Trails
  { name: 'UTMB', sport: 'trail', distanceKm: 171, terrainType: 'trail' as const, location: 'Chamonix, France', date: '2026-08-28', elevationM: 10000 },
  { name: 'Ultra-Trail du Mont-Blanc (UTMB)', sport: 'trail', distanceKm: 171, terrainType: 'trail' as const, location: 'Chamonix, France', date: '2026-08-28', elevationM: 10000 },
  { name: 'CCC (UTMB)', sport: 'trail', distanceKm: 101, terrainType: 'trail' as const, location: 'Courmayeur-Chamonix', date: '2026-08-27', elevationM: 6100 },
  { name: 'OCC (UTMB)', sport: 'trail', distanceKm: 56, terrainType: 'trail' as const, location: 'Orsières-Chamonix', date: '2026-08-26', elevationM: 3500 },
  { name: 'Trail des Templiers', sport: 'trail', distanceKm: 75, terrainType: 'trail' as const, location: 'Millau, France', date: '2026-10-18', elevationM: 3200 },
  { name: 'Diagonale des Fous', sport: 'trail', distanceKm: 165, terrainType: 'trail' as const, location: 'La Réunion, France', date: '2026-10-22', elevationM: 9576 },
  { name: 'EcoTrail de Paris', sport: 'trail', distanceKm: 80, terrainType: 'trail' as const, location: 'Paris, France', date: '2026-03-21', elevationM: 1400 },
  { name: 'Trail de la Sainte-Victoire', sport: 'trail', distanceKm: 46, terrainType: 'trail' as const, location: 'Aix-en-Provence, France', date: '2026-03-15', elevationM: 2000 },
  { name: 'Ultra-Trail de la Côte d\'Opale', sport: 'trail', distanceKm: 100, terrainType: 'trail' as const, location: 'Boulogne-sur-Mer, France', date: '2026-05-16' },
  // Triathlon
  { name: 'Ironman France Nice', sport: 'triathlon', distanceKm: 226, terrainType: 'mixed' as const, location: 'Nice, France', date: '2026-06-28' },
  { name: 'Ironman 70.3 Aix-en-Provence', sport: 'triathlon', distanceKm: 113, terrainType: 'mixed' as const, location: 'Aix-en-Provence, France', date: '2026-05-17' },
  { name: 'Triathlon de Paris', sport: 'triathlon', distanceKm: 51.5, terrainType: 'mixed' as const, location: 'Paris, France', date: '2026-07-05' },
  { name: 'Triathlon de Deauville', sport: 'triathlon', distanceKm: 51.5, terrainType: 'mixed' as const, location: 'Deauville, France', date: '2026-06-20' },
  { name: 'Ironman Hawaii Kona', sport: 'triathlon', distanceKm: 226, terrainType: 'mixed' as const, location: 'Kona, Hawaii', date: '2026-10-10' },
  // CrossFit
  { name: 'CrossFit Games', sport: 'crossfit', distanceKm: null, terrainType: 'indoor' as const, location: 'Madison, USA', date: '2026-08-03' },
  { name: 'French Throwdown', sport: 'crossfit', distanceKm: null, terrainType: 'indoor' as const, location: 'Paris, France', date: '2026-05-30' },
  { name: 'Wodapalooza', sport: 'crossfit', distanceKm: null, terrainType: 'indoor' as const, location: 'Miami, USA', date: '2027-01-15' },
  // Cycling
  { name: 'Étape du Tour', sport: 'cyclisme', distanceKm: 140, terrainType: 'road' as const, location: 'France (parcours variable)', date: '2026-07-12' },
  { name: 'La Marmotte', sport: 'cyclisme', distanceKm: 174, terrainType: 'road' as const, location: 'Alpe d\'Huez, France', date: '2026-07-04', elevationM: 5180 },
  { name: 'Paris-Roubaix Challenge', sport: 'cyclisme', distanceKm: 170, terrainType: 'road' as const, location: 'Roubaix, France', date: '2026-04-11' },
  // Swimming
  { name: 'Traversée de Paris à la nage', sport: 'natation', distanceKm: 5, terrainType: 'water' as const, location: 'Paris, France', date: '2026-07-04' },
  { name: 'Swim the Island', sport: 'natation', distanceKm: 6, terrainType: 'water' as const, location: 'Bergeggi, Italie', date: '2026-09-12' },
  // Obstacle
  { name: 'Spartan Race Paris', sport: 'crossfit', distanceKm: 21, terrainType: 'trail' as const, location: 'Paris, France', date: '2026-05-09' },
  { name: 'Spartan Race Beast', sport: 'crossfit', distanceKm: 21, terrainType: 'trail' as const, location: 'France', date: '2026-06-13' },
  { name: 'Tough Mudder', sport: 'crossfit', distanceKm: 16, terrainType: 'trail' as const, location: 'France', date: '2026-06-27' },
  { name: 'Mud Day', sport: 'crossfit', distanceKm: 13, terrainType: 'trail' as const, location: 'France', date: '2026-05-16' },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const sport = req.nextUrl.searchParams.get('sport');
  const scrape = req.nextUrl.searchParams.get('scrape') === 'true';

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const normalizedQ = normalize(q);
  const words = normalizedQ.split(/\s+/).filter(Boolean);

  // Filter local database
  let results = POPULAR_EVENTS.filter((e) => {
    const normalizedName = normalize(e.name);
    return words.every((w) => normalizedName.includes(w));
  });

  // Filter by sport if provided
  if (sport) {
    const sportResults = results.filter((e) => e.sport === sport);
    if (sportResults.length > 0) results = sportResults;
  }

  // Limit to 8 results
  const localResults = results.slice(0, 8).map((e) => ({
    ...e,
    source: 'local' as const,
  }));

  // If scrape requested and few local results, use Perplexity
  if (scrape && localResults.length < 3) {
    try {
      const scraped = await scrapeEvent(q);
      if (scraped.name) {
        return NextResponse.json([
          ...localResults,
          { ...scraped, source: 'perplexity' as const },
        ]);
      }
    } catch {
      // Perplexity failed, return local only
    }
  }

  return NextResponse.json(localResults);
}
