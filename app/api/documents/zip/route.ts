import {requireRead} from '@/lib/auth';
export const runtime='nodejs';
export const maxDuration=300;
import {database,bucket,failure} from '@/lib/storage';
import {ZIP_MAX_FILES,ZIP_MAX_BYTES,safeZipName,zipChunks,textSource} from '@/lib/zip-export';
import {today} from '@/lib/documents';
type Row={id:string;number:string;title:string;file_key:string;file_name:string;file_size:number};
const csv=(value:unknown)=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
export async function GET(request:Request){const denied=requireRead(request);if(denied)return denied;
 try{
  const url=new URL(request.url),ids=(url.searchParams.get('ids')||'').split(',');
  if(!ids.length||ids.length>ZIP_MAX_FILES||new Set(ids).size!==ids.length||ids.some(id=>!/^[-a-zA-Z0-9_]{1,100}$/.test(id)))return Response.json({error:'Danh sách tệp không hợp lệ.'},{status:400});
  const rows=(await database().prepare(`SELECT id,number,title,file_key,file_name,file_size FROM documents WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<Row>()).results;
  if(rows.reduce((n,r)=>n+r.file_size,0)>ZIP_MAX_BYTES)return Response.json({error:'Tệp đã thay đổi. Vui lòng chuẩn bị lại danh sách ZIP.'},{status:409});
  const byId=new Map(rows.map(r=>[r.id,r]));
  async function* sources(){
   const report=[['Mã văn bản','Số ký hiệu','Trích yếu','Tệp trong ZIP','Kết quả'].map(csv).join(',')];let missing=0;
   for(const id of ids){
    const row=byId.get(id);const object=row?.file_key?await bucket().get(row.file_key):null;
    if(!row||!object){missing++;report.push([id,row?.number,row?.title,row?.file_name,'Không tìm thấy tệp trong kho'].map(csv).join(','));continue}
    const name=`tep/${safeZipName(id)}_${safeZipName(row.file_name)}`;
    report.push([id,row.number,row.title,name,'Đã đưa vào ZIP'].map(csv).join(','));
    yield {name,body:object.body};
   }
   yield textSource('danh-muc.csv','\uFEFF'+report.join('\r\n'));
   yield textSource('HUONG-DAN.txt',`Gói tệp đính kèm văn bản — ${today()}\r\nDanh mục chi tiết nằm trong danh-muc.csv.\r\nSố tệp được yêu cầu: ${ids.length}. Số tệp không tìm thấy: ${missing}.\r\n${missing?'CẦN KIỂM TRA: gói này thiếu tệp. Xem các dòng không tìm thấy trong danh-muc.csv.':'Đã đưa đủ các tệp được yêu cầu vào gói.'}\r\nNội dung được lấy tại thời điểm tải. Đây là bản tải tệp, không phải bản sao lưu để khôi phục toàn bộ ứng dụng.`);
  }
  const iterator=zipChunks(sources());
  const stream=new ReadableStream<Uint8Array>({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(next.value)}catch(e){console.error('ZIP download failed',e);controller.error(e)}},async cancel(){await iterator.return(undefined)}});
  const part=(url.searchParams.get('part')||'1').replace(/[^0-9]/g,'').slice(0,6)||'1';
  return new Response(stream,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="van-ban-${today()}-phan-${part}.zip"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return failure(e)}
}


