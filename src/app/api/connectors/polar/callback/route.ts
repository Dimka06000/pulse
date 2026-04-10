import { NextRequest } from 'next/server';
import { handleOAuthCallback } from '@/lib/connectors/oauth-helpers';
import { exchangePolarCode, fetchPolarActivities, registerPolarUser } from '@/lib/connectors/polar';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  return handleOAuthCallback('polar', code, state, async (c) => {
    const tokenData = await exchangePolarCode(c);
    await registerPolarUser(tokenData.access_token, tokenData.user_id);
    return tokenData;
  }, fetchPolarActivities);
}
