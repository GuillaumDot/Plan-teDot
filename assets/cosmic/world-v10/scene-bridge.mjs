import {visibleWindow} from './full-potential.mjs';
// Bridge from legacy projected planet coordinates to a bounded offscreen V10 pass.
// Host owns the frame, audio, selection, and persistent data.
import {isWebGL2} from './gl-compat.mjs';
export const SCENE_TARGET_CAP=1024;
const valid3=v=>v?.length===3&&Array.from(v).every(Number.isFinite);
export function sceneFrame({basis,light,audio=0,time=0,delta=0,tier=2,growth=1,sunIntensity=1,sunColor=[1,1,1],lod=2,targetCap=0,fp=null,targetPixels=0}){
 if(!Array.isArray(basis)||basis.length!==3||!basis.every(valid3)||!valid3(light))throw Error('Invalid scene basis');
 const [x,y,z]=basis;
 // Columns are legacy viewOf(object-space unit vectors); positive z is near.
 const mvp=new Float32Array([.92*x[0],.92*x[1],-.5*x[2],0,.92*y[0],.92*y[1],-.5*y[2],0,.92*z[0],.92*z[1],-.5*z[2],0,0,0,0,1]);
 const eye=[x[2]*3,y[2]*3,z[2]*3];
 const objectLight=basis.map(v=>v.reduce((sum,q,i)=>sum+q*light[i],0));
 return {mvp,eye,light:objectLight,viewLight:light,audio,time,delta,tier,growth,sunIntensity,sunColor,lod,targetCap,fp,targetPixels};
}
export function sceneRect(body,width,height){
 if(![body?.x,body?.y,body?.r,width,height].every(Number.isFinite)||body.r<=0||width<=0||height<=0)return null;
 const r=body.r/.92;
 return [2*(body.x-r)/width-1,1-2*(body.y+r)/height,2*(body.x+r)/width-1,1-2*(body.y-r)/height];
}
export function createSceneCompositor(gl){
 if(!isWebGL2(gl))throw Error('Scene compositor requires WebGL2');
 let program=null,vao=null,texture=null,fbo=null,depth=null,closed=false;
 const shaders=[];
 function compile(type,source){const s=gl.createShader(type);if(!s)throw Error('Composite shader allocation');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function dispose(){if(closed)return;closed=true;if(program)gl.deleteProgram(program);if(vao)gl.deleteVertexArray(vao);if(texture)gl.deleteTexture(texture);if(fbo)gl.deleteFramebuffer(fbo);if(depth)gl.deleteRenderbuffer(depth);}
 try{
 const vs=compile(gl.VERTEX_SHADER,'#version 300 es\nuniform vec4 uRect;uniform vec2 uUvScale;out vec2 uv;out vec2 tuv;void main(){vec2 p=vec2(float(gl_VertexID%2),float(gl_VertexID/2));uv=p;tuv=p*uUvScale;gl_Position=vec4(mix(uRect.xy,uRect.zw,p),0.,1.);}');
 const fs=compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision mediump float;in vec2 uv;in vec2 tuv;uniform sampler2D uImage;uniform vec4 uHalo;uniform vec3 uViewLight;uniform vec4 uLocal;out vec4 color;void main(){color=texture(uImage,tuv);if(color.a<.01){vec2 p=mix(uLocal.xy,uLocal.zw,uv);float radius=length(p);if(radius<.915||radius>1.)discard;float h=max(0.,radius-.92);vec3 n=vec3(p/max(radius,.001),0.);float day=smoothstep(-.2,.5,dot(n,normalize(uViewLight)));float a=exp(-h*46.)*(1.-smoothstep(.965,1.,radius))*uHalo.a*(.035+.65*day);if(a<.005)discard;color=vec4(uHalo.rgb,a);}}');
 program=gl.createProgram();vao=gl.createVertexArray();texture=gl.createTexture();fbo=gl.createFramebuffer();depth=gl.createRenderbuffer();
 if(!program||!vao||!texture||!fbo||!depth)throw Error('Composite allocation failed');
 gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 }catch(e){dispose();throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
 const rectLoc=gl.getUniformLocation(program,'uRect'),imageLoc=gl.getUniformLocation(program,'uImage'),haloLoc=gl.getUniformLocation(program,'uHalo'),viewLightLoc=gl.getUniformLocation(program,'uViewLight'),uvScaleLoc=gl.getUniformLocation(program,'uUvScale'),localLoc=gl.getUniformLocation(program,'uLocal');
 // Hardware limits are immutable for this context; query once, not per frame.
 const targetLimit=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
 let allocated=0,allocW=0,allocH=0;
 return {draw(adapter,body,frame,width,height){
 if(closed||gl.isContextLost()||!adapter.ready)return false;
 let rect=sceneRect(body,width,height);if(!rect)return false;
 const cap=Math.min(frame.targetCap>0?frame.targetCap:frame.tier>=1?SCENE_TARGET_CAP:768,targetLimit);
 if(cap<32)return false;
 let size=Math.min(cap,Math.max(32,Math.ceil(body.r*2/.92/32)*32)),vw=size,vh=size,uvScale=[1,1],local=[-1,-1,1,1];
 // V10fp (?v10win) : seule la partie visible de la planète est rendue, à la résolution de l'écran dans la limite du budget de pixels
 // du palier. Au gros plan, l'ancien carré plafonné à 1024 était étiré ×3 : c'était le flou des bâtiments et des côtes.
 const win=frame.targetPixels>0?visibleWindow(body,width,height,frame.targetPixels):null;
 if(win){
  vw=Math.min(win.w,targetLimit);vh=Math.min(win.h,targetLimit);
  const need=[vw,vh].map(v=>Math.ceil(v/64)*64);
  if(need[0]>allocW||need[1]>allocH||need[0]*need[1]*2<allocW*allocH){allocW=need[0];allocH=need[1];}
  size=-1;uvScale=[vw/allocW,vh/allocH];local=win.local;
  const [x0,y0,x1,y1]=win.px;rect=[2*x0/width-1,1-2*y1/height,2*x1/width-1,1-2*y0/height];
  const cx=(local[0]+local[2])/2,cy=(local[1]+local[3])/2,hx=(local[2]-local[0])/2,hy=(local[3]-local[1])/2,m=Float32Array.from(frame.mvp);
  for(let c=0;c<4;c++){m[c*4]=(m[c*4]-cx*m[c*4+3])/hx;m[c*4+1]=(m[c*4+1]-cy*m[c*4+3])/hy;}
  frame={...frame,mvp:m};
 }else{allocW=allocH=size;}
 const old={draw:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),read:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),renderbuffer:gl.getParameter(gl.RENDERBUFFER_BINDING),viewport:gl.getParameter(gl.VIEWPORT),program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),unit:gl.getParameter(gl.ACTIVE_TEXTURE),color:gl.getParameter(gl.COLOR_WRITEMASK),depthMask:gl.getParameter(gl.DEPTH_WRITEMASK),clearColor:gl.getParameter(gl.COLOR_CLEAR_VALUE),clearDepth:gl.getParameter(gl.DEPTH_CLEAR_VALUE),depthFunc:gl.getParameter(gl.DEPTH_FUNC),srcRGB:gl.getParameter(gl.BLEND_SRC_RGB),dstRGB:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA),eqRGB:gl.getParameter(gl.BLEND_EQUATION_RGB),eqA:gl.getParameter(gl.BLEND_EQUATION_ALPHA)};
 const flags=[gl.DEPTH_TEST,gl.BLEND,gl.SCISSOR_TEST,gl.CULL_FACE,gl.STENCIL_TEST,gl.RASTERIZER_DISCARD,gl.POLYGON_OFFSET_FILL].map(k=>[k,gl.isEnabled(k)]);
 gl.activeTexture(gl.TEXTURE0);const oldTex=gl.getParameter(gl.TEXTURE_BINDING_2D),oldSampler=gl.getParameter(gl.SAMPLER_BINDING);
 try{
 gl.bindSampler(0,null);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.bindTexture(gl.TEXTURE_2D,texture);
 const key=allocW*65536+allocH;if(key!==allocated){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,allocW,allocH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,allocW,allocH);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete V10 target');allocated=key;}
 for(const [flag] of flags)gl.disable(flag);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.colorMask(true,true,true,true);gl.viewport(0,0,vw,vh);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 if(!adapter.draw(frame))return false;
 gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,old.draw);gl.viewport(...old.viewport);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.colorMask(...old.color);
 gl.useProgram(program);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindSampler(0,null);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(imageLoc,0);gl.uniform4fv(rectLoc,rect);gl.uniform2fv(uvScaleLoc,uvScale);gl.uniform4fv(localLoc,local);const tint=valid3(body.at)?body.at:[.25,.5,1];gl.uniform4f(haloLoc,tint[0],tint[1],tint[2],Math.max(0,Math.min(1,Number(body.atmo)||0)));gl.uniform3fv(viewLightLoc,frame.viewLight??[0,0,1]);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return !gl.isContextLost();
 }finally{
 gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,old.draw);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,old.read);gl.bindRenderbuffer(gl.RENDERBUFFER,old.renderbuffer);gl.viewport(...old.viewport);gl.useProgram(old.program);gl.bindVertexArray(old.vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,oldTex);gl.bindSampler(0,oldSampler);gl.activeTexture(old.unit);
 gl.colorMask(...old.color);gl.depthMask(old.depthMask);gl.depthFunc(old.depthFunc);gl.clearColor(...old.clearColor);gl.clearDepth(old.clearDepth);gl.blendFuncSeparate(old.srcRGB,old.dstRGB,old.srcA,old.dstA);gl.blendEquationSeparate(old.eqRGB,old.eqA);for(const [flag,enabled] of flags)enabled?gl.enable(flag):gl.disable(flag);
 }
 },dispose,get bytes(){return allocW*allocH*6;},get size(){return [allocW,allocH];}};
}
