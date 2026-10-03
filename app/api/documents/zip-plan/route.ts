import {requireRead} from '@/lib/auth';
export const runtime='nodejs';
export const maxDuration=300;
import {database,failure} from '@/lib/storage';
import {documentQuery,FilterError} from '@/lib/document-query';
import type {ZipItem} from '@/lib/zip-export';

export async function GET(request:Request){const denied=requireRead(request);if(denied)return denied;
 try{
  const url=new URL(request.url),cursor=url.searchParams.get('cursor')||'';
  if(cursor.length>100)throw new FilterError('Mốc tải không hợp lệ.');
  const q=documentQuery(url.searchParams.get('scope')==='all'?new URL(url.origin):url);
  const result=await database().prepare(`${q.cte} SELECT id,file_size,updated FROM ${q.table}${q.condition}${q.condition?' AND ':' WHERE '}file_key!='' AND id>? ORDER BY id LIMIT 501`).bind(...q.args,cursor).all<ZipItem>();
  const items=result.results.slice(0,500);
  return Response.json({items,next:result.results.length>500?items.at(-1)!.id:null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof FilterError)return Response.json({error:e.message},{status:400});return failure(e)}
}


