import {requireRead} from '@/lib/auth';
import {database,bucket,sameOrigin,failure} from '@/lib/storage';
import {documentQuery,documentColumns,FilterError,validDate} from '@/lib/document-query';
import {categories,normalize,Doc} from '@/lib/documents';
export const dynamic='force-dynamic';
const fields=['direction','number','title','organization','issuing_body','issued','received','category','assignee','due','urgency','status','notes','expires_on','replaced_by'];
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export async function GET(request:Request){const denied=requireRead(request);if(denied)return denied;try{
 const url=new URL(request.url),q=documentQuery(url);const rawPage=url.searchParams.get('page')||'1',rawSize=url.searchParams.get('pageSize')||'25';
 if(!/^\d{1,8}$/.test(rawPage)||!['10','25','50','100'].includes(rawSize))throw new FilterError('Phân trang không hợp lệ.');
 const pageSize=Number(rawSize),db=database();
 const [count,summary,due]=await Promise.all([
 db.prepare(q.cte+' SELECT COUNT(*) AS total FROM '+q.table+q.condition).bind(...q.args).first<{total:number}>(),
 db.prepare("SELECT COUNT(*) AS all_count,COALESCE(SUM((direction='in')::int),0) AS in_count,COALESCE(SUM((direction='out')::int),0) AS out_count,COALESCE(SUM((direction='internal')::int),0) AS internal_count,COALESCE(SUM((status!='done')::int),0) AS pending,COALESCE(SUM((status='done')::int),0) AS done,COALESCE(SUM((status!='done' AND due!='' AND due<?)::int),0) AS overdue FROM documents").bind(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).first<Record<string,number>>(),
 db.prepare('SELECT '+documentColumns+" FROM documents WHERE status!='done' AND due!='' ORDER BY due,id LIMIT 4").all<Doc>()]);
 const total=count?.total||0,page=Math.max(1,Math.min(Number(rawPage),Math.max(1,Math.ceil(total/pageSize))));
 const result=await db.prepare(q.cte+' SELECT '+documentColumns+' FROM '+q.table+q.condition+' ORDER BY created DESC,id DESC LIMIT ? OFFSET ?').bind(...q.args,pageSize,(page-1)*pageSize).all<Doc>();
 const x=summary||{};return Response.json({documents:result.results,total,page,pageSize,counts:{all:x.all_count||0,in:x.in_count||0,out:x.out_count||0,internal:x.internal_count||0,pending:x.pending||0,done:x.done||0,overdue:x.overdue||0},dueSoon:due.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof FilterError)return Response.json({error:e.message},{status:400});return failure(e);}}
export {saveDocument as POST} from '@/lib/save-document';

