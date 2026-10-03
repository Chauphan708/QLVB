export type Doc = {id:string;direction:string;number:string;title:string;organization:string;issuing_body:string;issued:string;received:string;category:string;assignee:string;due:string;urgency:string;status:string;notes:string;expires_on:string;replaced_by:string;file_name:string|null;file_size:number|null;created:string;updated:string};
export const statuses:Record<string,string> = {new:'Chưa xử lý',processing:'Đang xử lý',done:'Đã hoàn thành'};
export const categories=['Công văn','Quyết định','Thông báo','Kế hoạch','Báo cáo','Tờ trình','Khác'];
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const fmt=(s:string)=>s ? s.slice(0,10).split('-').reverse().join('/') : '—';
export const overdue=(d:Doc)=>!!d.due && d.due<today() && d.status!=='done';

export const directions:Record<string,string>={in:'Văn bản đến',out:'Văn bản đi',internal:'Văn bản nội bộ'};
export const issuingBodies=['Bộ Giáo dục và Đào tạo','Bộ Tài chính','Bộ Nội vụ','Chính phủ','Thủ tướng Chính phủ','Quốc hội','Ủy ban Thường vụ Quốc hội','Sở Giáo dục và Đào tạo','Sở Tài chính','Sở Nội vụ','UBND tỉnh / thành phố','UBND phường','UBND xã','HĐND tỉnh / thành phố','HĐND phường / xã','Nhà trường'];
export const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
export function matchesDocument(d:Doc,filters:{view:string;direction:string;status:string;category:string;search:string}){
 const {view,direction,status,category,search}=filters;
 return (view==='all'||view===d.direction||(view==='pending'&&d.status!=='done')||(view==='done'&&d.status==='done'))&&(direction==='all'||direction===d.direction)&&(status==='all'||(status==='overdue'?overdue(d):d.status===status))&&(category==='all'||d.category===category)&&normalize([d.number,d.title,d.organization,d.issuing_body||'',d.assignee].join(' ')).includes(normalize(search));
}

export function validityKey(d:Pick<Doc,'expires_on'|'replaced_by'>){return d.replaced_by?'replaced':d.expires_on?(d.expires_on<=today()?'expired':'dated'):'unknown'}
export const validityOptions:Record<string,string>={expired:'Đã hết hiệu lực',replaced:'Đã bị thay thế',dated:'Chưa đến ngày hết hiệu lực',unknown:'Chưa xác định'};
export function validityLabel(d:Pick<Doc,'expires_on'|'replaced_by'>){return validityOptions[validityKey(d)]}

