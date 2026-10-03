import {categories,directions,statuses,today} from './documents';
export const documentColumns='id,direction,number,title,organization,issuing_body,issued,received,category,assignee,due,urgency,status,notes,expires_on,replaced_by,file_name,file_size,created,updated';
export const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export class FilterError extends Error {}
export function documentQuery(url:URL){
 const p=url.searchParams,where:string[]=[],args:string[]=[];
 const view=p.get('view')||'all',direction=p.get('direction')||'all',status=p.get('status')||'all',category=p.get('category')||'all',validity=p.get('validity')||'all';
 const from=p.get('from')||'',to=p.get('to')||'',dateField=p.get('dateField')||'received',search=(p.get('search')||'').trim();
 if(!['all','pending','done',...Object.keys(directions)].includes(view)||!['all',...Object.keys(directions)].includes(direction)||!['all','overdue',...Object.keys(statuses)].includes(status)||!['all',...categories].includes(category)||!['all','expired','replaced','dated','unknown'].includes(validity)||!['received','issued'].includes(dateField)||search.length>500)throw new FilterError('Bộ lọc không hợp lệ.');
 if((from&&!validDate(from))||(to&&!validDate(to)))throw new FilterError('Ngày tìm kiếm không hợp lệ.');
 if(from&&to&&from>to)throw new FilterError('Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.');
 const add=(sql:string,value:string)=>{where.push(sql);args.push(value)};
 if(view in directions)add('direction=?',view);else if(view==='pending')where.push("status!='done'");else if(view==='done')where.push("status='done'");
 if(direction!=='all')add('direction=?',direction);
 if(status==='overdue'){where.push("status!='done' AND due!=''");add('due<?',today())}else if(status!=='all')add('status=?',status);
 if(category!=='all')add('category=?',category);
 if(from)add(`${dateField}>=?`,from);if(to)add(`${dateField}<=?`,to);
 if(validity==='replaced')where.push("replaced_by!=''");
 if(validity==='expired'){where.push("replaced_by='' AND expires_on!=''");add('expires_on<=?',today())}
 if(validity==='dated'){where.push("replaced_by=''");add('expires_on>?',today())}
 if(validity==='unknown')where.push("replaced_by='' AND expires_on=''");
 // The stored search text speeds up new records; the fallback preserves accent-insensitive search on older records without a destructive backfill.
 let cte=`WITH base AS (SELECT * FROM documents${where.length?' WHERE '+where.join(' AND '):''})`,table='base',condition='';
 if(search){
  cte+=`, n0 AS (SELECT *,number||' '||title||' '||organization||' '||issuing_body||' '||assignee AS norm0 FROM base)`;
  const pairs:[string,string][]=[];for(const [plain,letters] of Object.entries({a:'àáạảãâầấậẩẫăằắặẳẵ',e:'èéẹẻẽêềếệểễ',i:'ìíịỉĩ',o:'òóọỏõôồốộổỗơờớợởỡ',u:'ùúụủũưừứựửữ',y:'ỳýỵỷỹ',d:'đ'}))for(const letter of letters){pairs.push([letter,plain],[letter.toUpperCase(),plain])}
  let stage=0;for(let i=0;i<pairs.length;i+=12){let expression=`norm${stage}`;for(const [letter,plain] of pairs.slice(i,i+12))expression=`replace(${expression},'${letter}','${plain}')`;cte+=`, n${stage+1} AS (SELECT *,${expression} AS norm${stage+1} FROM n${stage})`;stage++}
  table=`n${stage}`;condition=` WHERE lower(COALESCE(NULLIF(search_text,''),norm${stage})) LIKE ? ESCAPE E'\\\\'`;
  const normalized=search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');args.push('%'+normalized.replace(/[\\%_]/g,'\\$&')+'%');
 }
 return {cte,table,condition,args,from,to,dateField};
}


