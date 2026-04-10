import { handleOAuthConnect } from '@/lib/connectors/oauth-helpers';
import { getGarminAuthUrl } from '@/lib/connectors/garmin';

export async function GET() {
  return handleOAuthConnect(getGarminAuthUrl);
}
