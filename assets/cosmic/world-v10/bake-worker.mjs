import {bakeWorld} from './bake.mjs';
self.onmessage=({data})=>{
 const {id,type,seed,size,smooth}=data??{};
 try{
 const result=bakeWorld(type,seed,size,{smooth:!!smooth});
 self.postMessage({id,ok:true,result},[...result.terrain,...result.climate].map(a=>a.buffer));
 }catch(error){self.postMessage({id,ok:false,error:String(error?.message??error)});}
};
