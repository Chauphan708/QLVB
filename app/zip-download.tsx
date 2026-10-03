'use client';
import {useRef,useState} from 'react';
import {Archive,Download} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {splitZipParts,type ZipItem,type ZipPart} from '@/lib/zip-export';
const size=(bytes:number)=>`${(bytes/1024/1024).toLocaleString('vi-VN',{maximumFractionDigits:1})} MB`;
export default function ZipDownload({query,invalid}:{query:string;invalid:boolean}){
 const [open,setOpen]=useState(false),[scope,setScope]=useState('all'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[parts,setParts]=useState<ZipPart[]|null>(null),[count,setCount]=useState(0),[started,setStarted]=useState<number[]>([]);
 const abort=useRef<AbortController|null>(null);
 function close(value:boolean){if(!value){abort.current?.abort();setBusy(false)}setOpen(value)}
 async function prepare(){
  abort.current?.abort();const controller=new AbortController();abort.current=controller;setBusy(true);setError('');setParts(null);setCount(0);setStarted([]);
  try{
   const items:ZipItem[]=[];let cursor='';
   do{const params=new URLSearchParams(query);params.set('scope',scope);params.set('cursor',cursor);const response=await fetch('/api/documents/zip-plan?'+params,{signal:controller.signal,cache:'no-store'});const data=await response.json() as {items:ZipItem[];next:string|null;error?:string};if(!response.ok)throw new Error(data.error||'Không chuẩn bị được danh sách tệp.');items.push(...data.items);setCount(items.length);cursor=data.next||''}while(cursor);
   setParts(splitZipParts(items));
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không chuẩn bị được danh sách tệp.')}finally{if(!controller.signal.aborted)setBusy(false)}
 }
 return <><button className="secondary compact" onClick={()=>{setOpen(true);setParts(null);setError('');setCount(0);setStarted([])}}><Archive size={16}/>Tải tệp ZIP</button><Dialog open={open} onOpenChange={close}><DialogContent className="zip-dialog"><DialogTitle>Tải tệp đính kèm (.zip)</DialogTitle><DialogDescription>Chọn toàn bộ kho hoặc các văn bản phù hợp bộ lọc hiện tại, gồm tất cả các trang.</DialogDescription><label className="zip-label">Phạm vi tải<Select value={scope} onValueChange={value=>{setScope(value);setParts(null);setError('')}} disabled={busy}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Toàn bộ tệp trong kho</SelectItem><SelectItem value="filtered" disabled={invalid}>Theo kết quả đang lọc</SelectItem></SelectContent></Select></label><button className="primary" disabled={busy||(scope==='filtered'&&invalid)} onClick={prepare}>{busy?`Đang tìm tệp… ${count.toLocaleString('vi-VN')}`:'Chuẩn bị tải ZIP'}</button>{busy&&<button className="secondary" onClick={()=>{abort.current?.abort();setBusy(false);setCount(0)}}>Hủy chuẩn bị</button>}{error&&<p role="alert" className="zip-error">{error} Hãy thử lại.</p>}{parts&&<div aria-live="polite"><p><strong>{count.toLocaleString('vi-VN')} tệp</strong>{parts.length>0&&` · ${size(parts.reduce((n,p)=>n+p.bytes,0))} · ${parts.length} gói ZIP`}</p>{!parts.length?<p>Không có tệp đính kèm trong phạm vi này.</p>:<><p className="zip-help">{parts.length>1?'Kho lớn được chia gói tối đa 40 tệp hoặc 100 MB. Tải lần lượt tất cả các phần bên dưới. ':'Nhấn nút bên dưới để tải. '}Kiểm tra tệp danh-muc.csv trong từng gói để biết tệp nào bị thiếu.</p><div className="zip-parts">{parts.map((part,index)=><a key={index} className="secondary zip-part" href={'/api/documents/zip?'+new URLSearchParams({ids:part.items.map(i=>i.id).join(','),part:String(index+1)})} download onClick={()=>setStarted(s=>s.includes(index)?s:[...s,index])}><Download size={17}/><span>{parts.length===1?'Tải ZIP':`Tải phần ${index+1}`}<small>{part.items.length} tệp · {size(part.bytes)}{started.includes(index)?' · Đã yêu cầu tải':''}</small></span></a>)}</div><p className="zip-help">Theo dõi hoàn tất trong mục tải xuống của trình duyệt. Có thể nhấn lại để tải lại từng phần. Văn bản không có tệp đính kèm không được đưa vào ZIP; dùng “Xuất sổ” để lấy danh sách văn bản.</p></>}</div>}</DialogContent></Dialog></>;
}

