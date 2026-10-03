import {requireRead} from '@/lib/auth';
export const runtime='nodejs';
export const maxDuration=300;
import {database,bucket,failure} from '@/lib/storage';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){const denied=requireRead(r);if(denied)return denied;try{const {id}=await params;const d=await database().prepare('SELECT file_key,file_name FROM documents WHERE id=?').bind(id).first();if(!d?.file_key)return new Response('Không tìm thấy tệp',{status:404});const file=await bucket().get(String(d.file_key));if(!file)return new Response('Không tìm thấy tệp',{status:404});return new Response(file.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(String(d.file_name))}`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}


