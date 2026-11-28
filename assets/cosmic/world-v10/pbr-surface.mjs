import {loadSurfaceImage} from './terrain-texture.mjs';
import {PBR_ROUGHNESS} from './full-potential.mjs';
// One pair per focused planet. No repeated retries after a failed pair.
export function createPbrSurface(gl,{load=loadSurfaceImage}={}){
 let key=null,controller=null,maps=null,generation=0;
 function release(){if(!key&&!maps)return;generation++;controller?.abort();controller=null;key=null;maps?.normal.dispose();maps?.color.dispose();maps=null;}
 async function select(preset,size){
  if(!Object.hasOwn(PBR_ROUGHNESS,preset)||![256,512].includes(size)){release();return false;}
  const next=preset+':'+size;if(key===next)return !!maps;
  release();key=next;const id=++generation,abort=new AbortController();controller=abort;
  const loadMap=async kind=>{const path='assets/blender/pbr-512/'+preset+'-'+kind+'.png';return load(gl,new URL('../../../'+path,import.meta.url),{maxSize:size,signal:abort.signal,repeatLongitude:true,resourcePath:path});};
  const result=await Promise.allSettled([loadMap('normal'),loadMap('albedo')]);
  const [normal,color]=result.map(x=>x.status==='fulfilled'?x.value:null);
  if(id!==generation||abort.signal.aborted||!normal||!color){normal?.dispose();color?.dispose();if(id===generation)controller=null;return false;}
  controller=null;maps={normal,color,roughness:PBR_ROUGHNESS[preset]};return true;
 }
 return {select,release,matches:(preset,size)=>key===preset+':'+size,get maps(){return maps;},get bytes(){return (maps?.normal.bytes||0)+(maps?.color.bytes||0);}};
}
