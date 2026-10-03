// Upload in 1-MiB chunks directly to Google. The OAuth token stays on the server.
export async function uploadAttachment(file:File,documentId:string,onProgress:(n:number)=>void){
 const start=await fetch('/api/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({documentId,name:file.name,size:file.size})}),data=await start.json();if(!start.ok)throw new Error(data.error||'Không khởi tạo được tải tệp.');let offset=0,retries=0;
 while(offset<file.size){const end=Math.min(offset+1024*1024,file.size);let response:Response;try{response=await fetch(data.sessionUrl,{method:'PUT',body:file.slice(offset,end),headers:{'Content-Type':'application/octet-stream','Content-Range':`bytes ${offset}-${end-1}/${file.size}`}})}catch{if(++retries>3)throw new Error('Mất kết nối khi tải lên Drive. Tệp chưa được gắn vào văn bản; vui lòng thử lại.');response=await fetch(data.sessionUrl,{method:'PUT',headers:{'Content-Range':`bytes */${file.size}`}})}
  if(response.ok){onProgress(100);return String(data.uploadId)}
  if(response.status===308){const range=response.headers.get('Range'),match=range&&/bytes=0-(\d+)/i.exec(range);if(!match)throw new Error('Trình duyệt không đọc được tiến độ từ Google Drive. Vui lòng kiểm tra cấu hình CORS/Origin hoặc thử lại.');const next=Number(match[1])+1;if(next<=offset&&++retries>3)throw new Error('Drive không nhận thêm dữ liệu. Vui lòng thử lại.');offset=next;onProgress(Math.round(offset/file.size*100));continue}
  throw new Error(`Không tải được tệp lên Drive (${response.status}). Vui lòng thử lại.`);
 }
 throw new Error('Drive chưa xác nhận hoàn tất tệp.');
}
