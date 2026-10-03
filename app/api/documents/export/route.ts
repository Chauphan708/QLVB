import {requireRead} from '@/lib/auth';
export const runtime='nodejs';
export const maxDuration=300;
import {database,failure} from '@/lib/storage';
import {documentQuery,documentColumns,FilterError} from '@/lib/document-query';
import {Doc,directions,statuses,validityLabel} from '@/lib/documents';
export const dynamic='force-dynamic';
const csv=(values:string[])=>values.map(v=>'"'+(/^[=+@\-\t\r]/.test(v)?"'":'')+v.replaceAll('"','""')+'"').join(',')+'\r\n';
export async function GET(request:Request){const denied=requireRead(request);if(denied)return denied;try{
 const q=documentQuery(new URL(request.url));const db=database();let cursor:{created:string;id:string}|null=null,finished=false;
 const getPage=()=>{const cursorSql=cursor?`${q.condition?' AND ':' WHERE '}(created<? OR (created=? AND id<?))`:'';const values=cursor?[...q.args,cursor.created,cursor.created,cursor.id]:q.args;return db.prepare(`${q.cte} SELECT ${documentColumns} FROM ${q.table}${q.condition}${cursorSql} ORDER BY created DESC,id DESC LIMIT 500`).bind(...values).all<Doc>()};
 let next=await getPage();const encoder=new TextEncoder();
 const body=new ReadableStream({start(controller){controller.enqueue(encoder.encode('\ufeff'+csv(['Số ký hiệu','Trích yếu','Luồng','Loại văn bản','Nơi gửi / nhận','Cơ quan ban hành','Ngày ban hành','Ngày vào sổ','Người xử lý','Hạn xử lý','Trạng thái xử lý','Ngày hết hiệu lực','Văn bản thay thế','Hiệu lực ghi nhận'])));},async pull(controller){try{if(finished){controller.close();return}const rows=next.results;controller.enqueue(encoder.encode(rows.map(d=>csv([d.number,d.title,directions[d.direction]||d.direction,d.category,d.organization,d.issuing_body,d.issued,d.received,d.assignee,d.due,statuses[d.status]||d.status,d.expires_on,d.replaced_by,validityLabel(d)])).join('')));if(rows.length<500){finished=true;controller.close();return}const last=rows[rows.length-1];cursor={created:last.created,id:last.id};next=await getPage();}catch(e){console.error('CSV export failed',e);controller.error(e);}},cancel(){finished=true;}});
 return new Response(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="so-van-ban.csv"','Cache-Control':'no-store'}});
 }catch(e){if(e instanceof FilterError)return Response.json({error:e.message},{status:400});return failure(e);}}


