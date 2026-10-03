import {createHmac,timingSafeEqual,randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
export function secret(){const v=process.env.APP_SECRET;if(!v||v.length<32)throw new Error('APP_SECRET cần ít nhất 32 ký tự.');return v}
export function sign(data:Record<string,unknown>,seconds:number){const body=Buffer.from(JSON.stringify({...data,exp:Date.now()+seconds*1000})).toString('base64url');return body+'.'+createHmac('sha256',secret()).update(body).digest('base64url')}
export function verify(token:string):Record<string,unknown>|null{try{const [body,sig,...rest]=token.split('.'),expected=createHmac('sha256',secret()).update(body).digest(),actual=Buffer.from(sig||'','base64url');if(rest.length||actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const d=JSON.parse(Buffer.from(body,'base64url').toString());return typeof d.exp==='number'&&d.exp>Date.now()?d:null}catch{return null}}
export const cookie=(r:Request,name:string)=>r.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';
export function isAdmin(r:Request){return verify(cookie(r,'office_admin'))?.role==='admin'}
export function appOrigin(){if(!process.env.APP_URL)throw new Error('Chưa cấu hình APP_URL.');return new URL(process.env.APP_URL).origin}
export function sameOrigin(r:Request){return r.headers.get('origin')===appOrigin()}
export function requireAdmin(r:Request){if(!isAdmin(r))return Response.json({error:'Vui lòng đăng nhập quản trị tại /settings.'},{status:401});if(!['GET','HEAD'].includes(r.method)&&!sameOrigin(r))return Response.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403});return null}
export function requireRead(r:Request){return process.env.PUBLIC_READ==='true'?null:requireAdmin(r)}
export function sessionCookie(name:string,value:string,age:number){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${appOrigin().startsWith('https:')?'; Secure':''}`}
export function seal(value:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(secret()).digest(),iv),encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url')}
export function unseal(value:string){const b=Buffer.from(value,'base64url'),d=createDecipheriv('aes-256-gcm',createHash('sha256').update(secret()).digest(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8')}
