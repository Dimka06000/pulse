import { handleOAuthConnect } from '@/lib/connectors/oauth-helpers';
import { getWhoopAuthUrl } from '@/lib/connectors/whoop';

export async function GET() {
  return handleOAuthConnect(getWhoopAuthUrl);
}
