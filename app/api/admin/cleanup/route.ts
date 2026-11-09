import {requireAdmin} from '@/lib/auth';
import {cleanupPendingUploads} from '@/lib/drive';
import {failure} from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(r: Request) {
  const denied = requireAdmin(r);
  if (denied) return denied;
  try {
    const result = await cleanupPendingUploads();
    return Response.json({ok: true, ...result});
  } catch (e) {
    return failure(e);
  }
}
