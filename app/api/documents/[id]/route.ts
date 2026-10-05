import {failure} from '@/lib/storage';
import {requireAdmin} from '@/lib/auth';
import {deleteDocument} from '@/lib/delete-document';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function DELETE(r: Request, {params}: {params: Promise<{id: string}>}) {
  const denied = requireAdmin(r);
  if (denied) return denied;
  let expectedVersion: string | null = null;
  const header = r.headers.get('X-Document-Version');
  if (header !== null) {
    try {
      expectedVersion = decodeURIComponent(header);
      if (!expectedVersion || expectedVersion.length > 100) throw new Error('Invalid version');
    } catch {return Response.json({error: 'Phiên bản văn bản không hợp lệ.'}, {status: 400})}
  }
  try {
    const {id} = await params;
    return await deleteDocument(id, expectedVersion);
  } catch (error) {return failure(error)}
}
