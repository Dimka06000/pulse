import { handleOAuthConnect } from '@/lib/connectors/oauth-helpers';
import { getFitbitAuthUrl } from '@/lib/connectors/fitbit';

export async function GET() {
  return handleOAuthConnect(getFitbitAuthUrl);
}
