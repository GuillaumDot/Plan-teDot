import {WORLD_CONFIG} from './config.mjs';
export function createWorldCache({limit=WORLD_CONFIG.cacheWorlds,worker=new Worker(new URL('./bake-worker.mjs',import.meta.url),{type:'module'})}={}){
 if(!Number.isInteger(limit)||limit<1||limit>16)throw new RangeError('Invalid cache limit');
 const cache=new Map(),pending=new Map(),queue=[];let active=null,seq=0,closed=false;
 function pump(){if(closed||active||!queue.length)return;active=queue.shift();try{worker.postMessage(active.request);}catch(e){fail(e);}}
 function fail(error){closed=true;for(const p of pending.values())p.reject(error);pending.clear();queue.length=0;active=null;cache.clear();worker.terminate();}
 worker.onmessage=({data})=>{if(!active||data.id!==active.request.id)return;const p=active;active=null;pending.delete(p.key);if(data.ok){cache.set(p.key,data.result);while(cache.size>limit)cache.delete(cache.keys().next().value);p.resolve(data.result);}else p.reject(new Error(data.error));pump();};
 worker.onerror=e=>fail(new Error(e.message||'Worker failed'));
 worker.onmessageerror=()=>fail(new Error('Worker message failed'));
 return {get(type,seed,size=WORLD_CONFIG.bakeResolution,{priority=false}={}){
 if(closed)return Promise.reject(new Error('Cache closed'));
 const key=JSON.stringify([type,String(seed),size]);if(cache.has(key)){const v=cache.get(key);cache.delete(key);cache.set(key,v);return Promise.resolve(v);}
 if(pending.has(key)){const p=pending.get(key);if(priority&&p!==active){const i=queue.indexOf(p);if(i>=0){queue.splice(i,1);queue.unshift(p);}}return p.promise;}
 if(pending.size>=limit*2)return Promise.reject(new Error('Generation queue full'));
 let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});const p={key,promise,resolve,reject,request:{id:++seq,type,seed,size}};pending.set(key,p);priority?queue.unshift(p):queue.push(p);pump();return promise;
 },clear(){cache.clear();},dispose(){if(!closed)fail(new Error('Cache disposed'));},get bytes(){return [...cache.values()].reduce((n,v)=>n+v.bytes,0);}};
}
