import { NextRequest } from 'next/server';
import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers';
import { exchangeGarminCode, fetchGarminActivities } from '@/lib/connectors/garmin';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  return handleOAuthCallback('garmin', code, state, exchangeGarminCode, fetchGarminActivities);
}
