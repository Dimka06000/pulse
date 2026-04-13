// ── Evidence search API — GET /api/training/evidence?sport=&goal= ──

import { NextRequest, NextResponse } from 'next/server';
import { searchTrainingEvidence, type PubMedResult } from '@/lib/training/pubmed-search';

// In-memory cache: key -> { data, expiresAt }
const cache = new Map<string, { data: PubMedResult[]; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sport = searchParams.get('sport') ?? '';
  const goal = searchParams.get('goal') ?? 'general fitness';

  if (!sport) {
    return NextResponse.json({ error: 'sport is required' }, { status: 400 });
  }

  const cacheKey = `${sport}::${goal}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const results = await searchTrainingEvidence(sport, goal);
  cache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL_MS });

  return NextResponse.json(results);
}
