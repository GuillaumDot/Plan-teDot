import {bakeWorld} from './bake.mjs';
self.onmessage=({data})=>{
 const {id,type,seed,size}=data??{};
 try{
 const result=bakeWorld(type,seed,size);
 self.postMessage({id,ok:true,result},[...result.terrain,...result.climate].map(a=>a.buffer));
 }catch(error){self.postMessage({id,ok:false,error:String(error?.message??error)});}
};
