import {requireAdmin, requireRead} from '@/lib/auth';
import {getPrintConfig, savePrintConfig} from '@/lib/print-config';
import {failure} from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(r: Request) {
  const denied = requireRead(r);
  if (denied) return denied;
  try {
    const config = await getPrintConfig();
    return Response.json(config, {headers: {'Cache-Control': 'no-store'}});
  } catch (e) {
    return failure(e);
  }
}

export async function POST(r: Request) {
  const denied = requireAdmin(r);
  if (denied) return denied;
  try {
    const body = await r.json();
    if (typeof body !== 'object' || body === null) {
      return Response.json({error: 'Dữ liệu cấu hình không hợp lệ.'}, {status: 400});
    }
    const updated = await savePrintConfig(body);
    return Response.json({ok: true, config: updated}, {headers: {'Cache-Control': 'no-store'}});
  } catch (e) {
    return failure(e);
  }
}
