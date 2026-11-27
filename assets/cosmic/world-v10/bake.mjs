import {makeSurface} from './surface.mjs';
import {WORLD_CONFIG} from './config.mjs';
// WebGL cube face order +X,-X,+Y,-Y,+Z,-Z; rows follow texture t.
export function cubeDirection(face,u,v){switch(face){case 0:return [1,-v,-u];case 1:return [-1,-v,u];case 2:return [u,1,v];case 3:return [u,-1,-v];case 4:return [u,-v,1];case 5:return [-u,-v,-1];default:throw new RangeError('Invalid face');}}
const byte=x=>Math.round(Math.max(0,Math.min(1,x))*255);
export function bakeWorld(type,seed,size=WORLD_CONFIG.bakeResolution){
 if(!Number.isInteger(size)||size<8||size>128)throw new RangeError('Resolution 8..128');
 const sample=makeSurface(type,seed),terrain=[],climate=[];
 for(let face=0;face<6;face++){const a=new Uint8Array(size*size*4),b=new Uint8Array(a.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const p=sample(...cubeDirection(face,2*(x+.5)/size-1,2*(y+.5)/size-1)),i=4*(y*size+x);a[i]=byte(p.height);a[i+1]=byte(p.water);a[i+2]=byte(p.ice);a[i+3]=byte(p.metal);b[i]=byte(p.heat);b[i+1]=byte(p.humidity);b[i+2]=byte(p.cloud);b[i+3]=byte(p.emission);}
 terrain.push(a);climate.push(b);}
 return {type,seed,size,terrain,climate,bytes:48*size*size};
}
// Data maps, not color textures; upload as linear RGBA8 without sRGB conversion.
