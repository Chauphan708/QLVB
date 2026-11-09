import {requireRead} from '@/lib/auth';
import {database, failure} from '@/lib/storage';
import {getDocumentLogs} from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(r: Request, {params}: {params: Promise<{id: string}>}) {
  const denied = requireRead(r);
  if (denied) return denied;
  try {
    const {id} = await params;
    const logs = await getDocumentLogs(database(), id);
    return Response.json({logs}, {headers: {'Cache-Control': 'no-store'}});
  } catch (e) {
    return failure(e);
  }
}
