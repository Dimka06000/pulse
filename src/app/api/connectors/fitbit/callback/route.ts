import { NextRequest } from 'next/server';
import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers';
import { exchangeFitbitCode, fetchFitbitActivities } from '@/lib/connectors/fitbit';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  return handleOAuthCallback('fitbit', code, state, exchangeFitbitCode, fetchFitbitActivities);
}
