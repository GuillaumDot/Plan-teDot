import {approach} from './transitions.mjs';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const finite=(x,fallback)=>Number.isFinite(x)?x:fallback;
export const CAMERA_LIMITS=Object.freeze({minZoom: .8,maxZoom:3.2,maxPitch:1.35});
export function cameraTarget(state,{yaw=0,pitch=0,zoom=1}={}){
 return {yaw:finite(state.yaw,0)+finite(yaw,0),pitch:clamp(finite(state.pitch,0)+finite(pitch,0),-CAMERA_LIMITS.maxPitch,CAMERA_LIMITS.maxPitch),zoom:clamp(finite(state.zoom,1)*finite(zoom,1),CAMERA_LIMITS.minZoom,CAMERA_LIMITS.maxZoom)};
}
export function cameraStep(current,target,dt,reduced=false){
 const t=cameraTarget(target);
 if(reduced)return t;
 return {yaw:approach(current.yaw,t.yaw,dt,.10),pitch:approach(current.pitch,t.pitch,dt,.10),zoom:approach(current.zoom,t.zoom,dt,.16)};
}
export function cameraFrame(state){
 const {yaw,pitch,zoom}=cameraTarget(state),c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),k=.83*zoom;
 const right=[c,0,s],up=[-s*sp,cp,c*sp],depth=[-s*cp,-sp,c*cp];
 const mvp=new Float32Array([k*right[0],k*up[0],.5*depth[0],0,k*right[1],k*up[1],.5*depth[1],0,k*right[2],k*up[2],.5*depth[2],0,0,0,0,1]);
 return {mvp,eye:depth.map(x=>-3*x),light:right.map((x,i)=>-.45*x+.35*up[i]-.82*depth[i])};
}
