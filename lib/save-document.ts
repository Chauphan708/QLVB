import {randomUUID} from 'node:crypto';
import {database,transaction} from './database';
import {requireAdmin} from './auth';
import {attachmentMetadata,getDriveConnection,bucket} from './drive';
import {failure} from './storage';
import {categories,normalize} from './documents';
import {validDate} from './document-query';
import {isAllowedUploadSize,UPLOAD_SIZE_ERROR} from './upload-limits';
const fields=['direction','number','title','organization','issuing_body','issued','received','category','assignee','due','urgency','status','notes','expires_on','replaced_by'];
type Pending={id:string;document_id:string;drive_id:string;file_name:string;file_size:number};
class SaveError extends Error{constructor(message:string,public status=400){super(message)}}
export async function saveDocument(r:Request){const denied=requireAdmin(r);if(denied)return denied;try{
 if(Number(r.headers.get('content-length'))>65536)return Response.json({error:'Chỉ gửi thông tin văn bản; tệp phải tải trực tiếp lên Drive.'},{status:413});
 const form=await r.formData(),v:Record<string,string>={};for(const f of fields)v[f]=String(form.get(f)||'').trim();
 if(form.get('file') instanceof File)throw new SaveError('Hãy tải tệp qua kết nối Drive.');
 if(!['in','out','internal'].includes(v.direction)||!v.number||!v.title||!v.organization||!validDate(v.issued)||!validDate(v.received)||!categories.includes(v.category)||!['normal','urgent','express'].includes(v.urgency)||!['new','processing','done'].includes(v.status)||(v.due&&!validDate(v.due))||fields.some(f=>v[f].length>(f==='notes'?5000:500)))throw new SaveError('Vui lòng kiểm tra các trường bắt buộc và ngày tháng.');
 if(v.expires_on&&(!validDate(v.expires_on)||v.expires_on<v.issued))throw new SaveError('Ngày hết hiệu lực phải hợp lệ và không trước ngày ban hành.');
 if(v.replaced_by&&normalize(v.replaced_by)===normalize(v.number))throw new SaveError('Văn bản thay thế phải khác số ký hiệu của văn bản này.');
 const edit=String(form.get('id')||''),id=edit||String(form.get('new_id')||randomUUID()),uploadId=String(form.get('upload_id')||'');if(!/^[-\w]{1,100}$/.test(id))throw new SaveError('Mã văn bản không hợp lệ.');
 let pending:Pending|undefined;
 if(uploadId){pending=await database().prepare("SELECT * FROM pending_uploads WHERE id=? AND created_at>now()-interval '1 day'").bind(uploadId).first<Pending>();if(!pending||pending.document_id!==id)throw new SaveError('Phiên tải tệp hết hạn hoặc không thuộc văn bản này.');if(!isAllowedUploadSize(pending.file_size))throw new SaveError(UPLOAD_SIZE_ERROR);const [meta,drive]=await Promise.all([attachmentMetadata(pending.drive_id),getDriveConnection()]);if(meta.trashed||Number(meta.size)!==pending.file_size||meta.appProperties?.upload_id!==uploadId||!meta.parents?.includes(drive.folderId))throw new SaveError('Drive chưa có tệp hoàn chỉnh hoặc tệp không thuộc thư mục đã kết nối.');}
 let oldKey:string|null=null;
 await transaction(async db=>{
  const old=await db.prepare('SELECT * FROM documents WHERE id=? FOR UPDATE').bind(id).first();
  if(edit&&!old)throw new SaveError('Không tìm thấy văn bản.',404);if(!edit&&old)throw new SaveError('Văn bản này đã được lưu. Hãy tải lại danh sách.',409);
  if(old&&String(form.get('expected_updated')||'')!==old.updated)throw new SaveError('Văn bản đã được sửa ở nơi khác. Hãy mở lại bản mới nhất.',409);
  if(pending){const current=await db.prepare('SELECT id FROM pending_uploads WHERE id=? FOR UPDATE').bind(uploadId).first();if(!current)throw new SaveError('Tệp đã được sử dụng. Hãy tải lại danh sách.',409)}
  const key=pending?.drive_id??old?.file_key??null,name=pending?.file_name??old?.file_name??null,size=pending?.file_size??old?.file_size??null,now=new Date().toISOString(),search=normalize([v.number,v.title,v.organization,v.issuing_body,v.assignee].join(' ')),values=[...fields.map(f=>v[f]),search,key,name,size,now];
  if(old){await db.prepare('UPDATE documents SET '+[...fields,'search_text','file_key','file_name','file_size','updated'].map(f=>f+'=?').join(',')+' WHERE id=?').bind(...values,id).run();if(pending&&old.file_key)oldKey=String(old.file_key)}
  else await db.prepare('INSERT INTO documents ('+[...fields,'search_text','file_key','file_name','file_size','updated','id','created'].join(',')+') VALUES ('+[...values,id,now].map(()=>'?').join(',')+')').bind(...values,id,now).run();
  if(pending)await db.prepare('DELETE FROM pending_uploads WHERE id=?').bind(uploadId).run();
 });
 let warning='';if(oldKey)try{await bucket().delete(oldKey)}catch{warning='Đã lưu văn bản. Tệp cũ vẫn còn trong Drive; có thể kiểm tra và dọn sau.'}
 return Response.json({id,warning});
 }catch(e){if(e instanceof SaveError)return Response.json({error:e.message},{status:e.status});return failure(e)}}
