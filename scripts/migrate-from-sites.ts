import {database,transaction,connection} from '../lib/database';
import {accessToken,driveFetch,driveJson,attachmentMetadata} from '../lib/drive';
import {normalize,type Doc} from '../lib/documents';

const args=process.argv.slice(2),index=args.indexOf('--source');
if(index<0||!args[index+1])throw new Error('Dùng: npm exec tsx -- scripts/migrate-from-sites.ts --source https://SITE-CU --apply (bỏ --apply để chỉ kiểm tra).');
const source=new URL(args[index+1]);if(source.protocol!=='https:')throw new Error('Nguồn phải dùng HTTPS.');
const apply=args.includes('--apply'),rows:Doc[]=[],seen=new Set<string>();let expected:number|null=null;
try{
 for(let page=1;;page++){
  const response=await fetch(new URL('/api/documents?pageSize=100&page='+page,source));if(!response.ok)throw new Error('Không đọc được nguồn. Công cụ này dành cho site cũ đang công khai.');
  const data=await response.json();if(expected===null)expected=data.total;if(expected!==data.total)throw new Error('Số lượng ở nguồn đang thay đổi. Hãy tạm dừng nhập liệu rồi chạy lại.');
  for(const doc of data.documents as Doc[]){if(seen.has(doc.id))throw new Error('Danh sách nguồn thay đổi giữa các trang. Hãy thử lại khi ngừng nhập liệu.');seen.add(doc.id);rows.push(doc)}
  if(rows.length>=expected!)break;if(!data.documents.length)throw new Error('Nguồn trả về trang rỗng trước khi đủ văn bản.');
 }
 if(rows.length!==expected)throw new Error('Không lấy được đầy đủ danh sách nguồn.');
 console.log(`Đã đọc ${rows.length} văn bản; ${rows.filter(r=>r.file_name).length} tệp. Chế độ: ${apply?'CHUYỂN DỮ LIỆU':'CHỈ KIỂM TRA'}.`);
 if(!apply){console.log('Chưa ghi vào Supabase hoặc Drive. Thêm --apply sau khi đã cấu hình và kết nối Drive.');process.exitCode=0}
 else{
  let saved=0,skipped=0;
  for(const d of rows){
   if(await database().prepare('SELECT id FROM documents WHERE id=?').bind(d.id).first()){skipped++;continue}
   let driveId:string|null=null;
   if(d.file_name){
    // Find a prior completed upload after an interrupted migration, avoiding duplicates.
    const auth=await accessToken(),tag=d.id.replace(/['\\]/g,'');
    const originTag=source.origin.replace(/['\\]/g,'');
    const q=`'${auth.connection.folderId}' in parents and trashed=false and appProperties has { key='legacy_id' and value='${tag}' } and appProperties has { key='legacy_source' and value='${originTag}' }`;
    const existing=await driveJson('drive/v3/files?'+new URLSearchParams({q,fields:'files(id,size)',pageSize:'10'}),{},auth.token);
    const complete=existing.files?.find((f:{id:string;size:string})=>Number(f.size)===d.file_size);
    if(complete)driveId=complete.id;
    else{
     const original=await fetch(new URL('/api/documents/'+encodeURIComponent(d.id)+'/file',source));if(!original.ok||!original.body)throw new Error('Không lấy được tệp của văn bản '+d.number+'. Dừng để tránh bỏ sót.');
     const bytes=new Uint8Array(await original.arrayBuffer());if(bytes.length!==d.file_size)throw new Error('Kích thước tệp nguồn không khớp: '+d.number);
     const init=await driveFetch('upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Length':String(bytes.length),'X-Upload-Content-Type':'application/octet-stream'},body:JSON.stringify({name:d.file_name,parents:[auth.connection.folderId],appProperties:{legacy_id:tag,legacy_source:source.origin}})},auth.token);
     const location=init.headers.get('location');if(!init.ok||!location||new URL(location).origin!=='https://www.googleapis.com')throw new Error('Không tạo được phiên tải Drive.');
     const result=await fetch(location,{method:'PUT',body:bytes,headers:{'Content-Type':'application/octet-stream'}});if(!result.ok)throw new Error('Không chuyển được tệp '+d.number);driveId=(await result.json()).id;
    }
   }
   const fields=['id','direction','number','title','organization','issuing_body','issued','received','category','assignee','due','urgency','status','notes','expires_on','replaced_by','created','updated'];
   const values=fields.map(k=>String(d[k as keyof Doc]??''));
   await transaction(async db=>{await db.prepare('INSERT INTO documents ('+[...fields,'search_text','file_key','file_name','file_size'].join(',')+') VALUES ('+Array(fields.length+4).fill('?').join(',')+')').bind(...values,normalize([d.number,d.title,d.organization,d.issuing_body,d.assignee].join(' ')),driveId,d.file_name,d.file_size).run()});saved++;console.log(`Đã chuyển ${saved}; bỏ qua ${skipped}; số văn bản ${d.number}`);
  }
  console.log(`Hoàn tất: ${saved} văn bản mới, ${skipped} đã có. Nguồn cũ không bị xóa hay sửa.`);
 }
}finally{if(process.env.DATABASE_URL)await connection().end()}
