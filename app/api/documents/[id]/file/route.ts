import {requireRead} from '@/lib/auth';
export const runtime='nodejs';
export const maxDuration=300;
import {database,bucket,failure} from '@/lib/storage';

const mimeMap: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){
  const denied=requireRead(r);if(denied)return denied;
  try{
    const {id}=await params;
    const d=await database().prepare('SELECT file_key,file_name FROM documents WHERE id=?').bind(id).first<{file_key:string;file_name:string}>();
    if(!d?.file_key)return new Response('Không tìm thấy tệp',{status:404});
    const file=await bucket().get(String(d.file_key));
    if(!file)return new Response('Không tìm thấy tệp',{status:404});
    const url=new URL(r.url);
    const isPreview=url.searchParams.get('preview')==='1'||url.searchParams.get('inline')==='1';
    const ext=(String(d.file_name).split('.').pop()||'').toLowerCase();
    const mime=mimeMap[ext];
    const encodedName=encodeURIComponent(String(d.file_name));
    const contentType=isPreview&&mime?mime:'application/octet-stream';
    const disposition=isPreview&&mime
      ?`inline; filename*=UTF-8''${encodedName}`
      :`attachment; filename="document"; filename*=UTF-8''${encodedName}`;
    return new Response(file.body,{headers:{'Content-Type':contentType,'Content-Disposition':disposition,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
  }catch(e){return failure(e);}
}


