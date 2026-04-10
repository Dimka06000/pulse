import { handleOAuthConnect } from '@/lib/connectors/oauth-helpers';
import { getOuraAuthUrl } from '@/lib/connectors/oura';

export async function GET() {
  return handleOAuthConnect(getOuraAuthUrl);
}
