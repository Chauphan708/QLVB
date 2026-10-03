import {Zip,ZipPassThrough,strToU8} from 'fflate';

export const ZIP_MAX_FILES=40;
export const ZIP_MAX_BYTES=100*1024*1024;
export type ZipItem={id:string;file_size:number;updated:string};
export type ZipPart={items:ZipItem[];bytes:number};
export function splitZipParts(items:ZipItem[]){
 const parts:ZipPart[]=[];
 for(const item of items){let part=parts.at(-1);if(!part||part.items.length>=ZIP_MAX_FILES||part.bytes+item.file_size>ZIP_MAX_BYTES){part={items:[],bytes:0};parts.push(part)}part.items.push(item);part.bytes+=item.file_size}
 return parts;
}
export function safeZipName(name:string){return name.normalize('NFC').replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g,'_').replace(/^\.+|[. ]+$/g,'').slice(0,160)||'tep-dinh-kem'}
export type ZipSource={name:string;body:ReadableStream<Uint8Array>};
// Only the current input chunk and small ZIP directory stay in memory.
export async function* zipChunks(sources:AsyncIterable<ZipSource>){
 const queue:Uint8Array[]=[];let failure:Error|null=null;
 const zip=new Zip((error,data)=>{if(error)failure=error;else queue.push(data)});
 try{
  for await(const source of sources){
   const reader=source.body.getReader();let complete=false;
   try{const entry=new ZipPassThrough(source.name);zip.add(entry);while(queue.length)yield queue.shift()!;while(true){const result=await reader.read();if(result.done){complete=true;break}entry.push(result.value,false);if(failure)throw failure;while(queue.length)yield queue.shift()!;}entry.push(new Uint8Array(),true);while(queue.length)yield queue.shift()!}
   finally{if(!complete)await reader.cancel();reader.releaseLock()}
  }
  zip.end();if(failure)throw failure;while(queue.length)yield queue.shift()!;
 }finally{zip.terminate()}
}
export function textSource(name:string,text:string):ZipSource{return {name,body:new ReadableStream({start(c){c.enqueue(strToU8(text));c.close()}})}}

