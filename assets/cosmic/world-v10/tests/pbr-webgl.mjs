// Run from repository root: npm install --no-save playwright && npx playwright install chromium
// node assets/cosmic/world-v10/tests/pbr-webgl.mjs
// Local isolated static server, no app auth, audio, service worker or database.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8">');return;}
  const path=resolve(root,'.'+decodeURIComponent(pathname));
  if(!path.startsWith(resolve(root)+sep))throw Error('Outside test root');
  const data=await readFile(path);
  res.setHeader('Content-Type',path.endsWith('.mjs')?'text/javascript':path.endsWith('.png')?'image/png':'text/plain');res.end(data);
 }catch(e){res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 const useWebKit=process.argv.includes('--webkit');
 browser=await (useWebKit?webkit:chromium).launch(useWebKit?{headless:true}:{headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const result=await page.evaluate(async()=>{
  const {loadPlanetProgram}=await import('/assets/cosmic/world-v10/program.mjs');
  const {createPbrSurface}=await import('/assets/cosmic/world-v10/pbr-surface.mjs');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL2 unavailable (test cannot pass)');
  const check=(v,m)=>{if(!v)throw Error(m);};
  const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const vao=gl.createVertexArray(),vbo=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.8,-.8,.2,.8,-.8,.2,0,.8,.8]),gl.STATIC_DRAW);
  const textures=[];
  function cube(unit,pixel){
   const t=gl.createTexture();textures.push(t);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_CUBE_MAP,t);
   for(let i=0;i<6;i++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(pixel));
   gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  }
  function tex(unit,pixel){
   const t=gl.createTexture();textures.push(t);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(pixel));
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  }
  cube(0,[170,80,20,32]);cube(1,[160,120,70,64]);tex(2,[150,140,120,255]);tex(3,[128,128,128,255]);tex(4,[128,128,255,255]);tex(5,[110,160,200,255]);
  const draws=[];
  for(const materials of [false,true]){
   const p=await loadPlanetProgram(gl,{materials});const u=p.uniforms;gl.useProgram(p.program);
   check(materials?u.uPbrNormal!==null:!Object.hasOwn(u,'uPbrNormal'),'PBR uniform gating');
   gl.enableVertexAttribArray(p.position);gl.vertexAttribPointer(p.position,3,gl.FLOAT,false,0,0);
   gl.uniformMatrix4fv(u.uMVP,false,identity);
   for(const [name,unit] of [['uTerrain',0],['uClimate',1],['uDetail',2],['uHeight',3],['uPbrNormal',4],['uPbrColor',5]])if(u[name]!=null)gl.uniform1i(u[name],unit);
   for(const [name,value] of Object.entries({uMicroStrength:.7,uDetailStrength:.8,uDetailAtlas:0,uDetailInset:0,uSunIntensity:1,uAtmosphereDensity:.4,uRelief:.2,uShadowQuality:1,uTexel:.01,uTime:2,uBakedRoughness:.32}))if(u[name]!=null)gl.uniform1f(u[name],value);
   gl.uniform3fv(u.uLight,[.3,.2,1]);gl.uniform3fv(u.uSunColor,[1,1,1]);gl.uniform3fv(u.uEye,[0,0,3]);gl.uniform3fv(u.uAtmosphereTint,[.2,.5,1]);gl.uniform3fv(u.uStormCenter,[1,0,0]);
   gl.uniform4fv(u.uAudA,[.4,.2,.1,.5]);gl.uniform4fv(u.uAudB,[.2,2,3,1]);
   for(let family=0;family<7;family++){
    gl.uniform1i(u.uFamily,family);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
    const pixel=new Uint8Array(4);gl.readPixels(32,32,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    check(gl.getError()===gl.NO_ERROR,'GL error family '+family+' PBR '+materials);
    check(pixel[3]===255&&pixel.slice(0,3).some(v=>v>0),'black or missing planet '+family);
    draws.push({family,materials,pixel:Array.from(pixel)});
   }
   p.dispose();
  }
  const surface=createPbrSurface(gl);
  check(await surface.select('ocean',256),'real ocean textures failed');
  const bytes=surface.bytes;check(bytes>=256*128*2*4,'unexpected texture byte count');
  check(gl.getError()===gl.NO_ERROR,'texture upload error');
  surface.release();check(surface.bytes===0,'PBR bytes not released');
  textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(vbo);gl.deleteVertexArray(vao);
  return {draws,bytes,released:surface.bytes};
 });
 assert.equal(result.draws.length,14);assert.equal(result.released,0);
 console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
