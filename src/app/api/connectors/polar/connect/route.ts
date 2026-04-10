import { handleOAuthConnect } from '@/lib/connectors/oauth-helpers';
import { getPolarAuthUrl } from '@/lib/connectors/polar';

export async function GET() {
  return handleOAuthConnect(getPolarAuthUrl);
}
