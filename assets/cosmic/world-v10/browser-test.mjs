import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/assets/cosmic/world-v10/preview-3d.html');
 for(const type of ['earth','aquatic','rock','volcanic','ice','gas','spectralMetallic']){
 await page.selectOption('#family',type);
 await page.waitForFunction(()=>document.querySelector('#status').textContent==='Planète chargée');
 await page.waitForFunction(()=>['ready','none','fallback'].includes(document.querySelector('canvas').dataset.detail));
 assert.equal(await page.locator('canvas').getAttribute('data-detail'),type==='gas'?'none':'ready',type+' detail texture');
 assert.equal(await page.locator('canvas').getAttribute('data-detail-mode'),type==='earth'?'atlas':type==='gas'?'none':'single');
 await page.waitForTimeout(200);
 const result=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl');return new Promise(resolve=>requestAnimationFrame(()=>{const pixel=new Uint8Array(4);gl.readPixels(c.width>>1,c.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);resolve({error:gl.getError(),pixel:[...pixel]});}));});
 assert.equal(result.error,0,type);assert.ok(result.pixel.slice(0,3).some((v,i)=>Math.abs(v-[6,9,18][i])>4),type+' appears blank');
 await page.screenshot({path:'v10-'+type+'.png'});
 }
 const textureCheck=await page.evaluate(async()=>{
 const {loadTerrainAlbedo,loadEarthDetailAtlas}=await import('./terrain-texture.mjs');
 const {assertTextureGL}=await import('./texture-guard.mjs');
 const gl=document.querySelector('canvas').getContext('webgl');
 const asset=await loadTerrainAlbedo(gl,'earth','alpine',{maxSize:64});
 const valid=gl.isTexture(asset.texture)&&asset.width<=64&&asset.height<=64;
 const texture=asset.texture;asset.dispose();asset.dispose();
 const released=!gl.isTexture(texture);
 const gas=await loadTerrainAlbedo(gl,'gas','alpine');
 const atlas=await loadEarthDetailAtlas(gl,{maxSize:64});const atlasValid=atlas.atlas&&atlas.width===64&&atlas.bytes===16384&&gl.isTexture(atlas.texture);const atlasTexture=atlas.texture;atlas.dispose();const atlasReleased=!gl.isTexture(atlasTexture);
 gl.enable(0);
 let rejected=false;try{assertTextureGL(gl,'Injected failure')}catch(e){rejected=e.message.includes('WebGL error');}
 return {valid,released,atlasValid,atlasReleased,gas:gas===null,rejected,error:gl.getError()};
 });
 assert.deepEqual(textureCheck,{valid:true,released:true,atlasValid:true,atlasReleased:true,gas:true,rejected:true,error:0});
 // Draw the same synthetic terrain at both tiers and inspect GL errors.
// This checks both branches; visual shadow fidelity requires device review.
 const qualityCheck=await page.evaluate(async()=>{
  const {createPlanetRenderer}=await import('./renderer.mjs');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});
  const renderer=await createPlanetRenderer(gl);
  const size=16;
  const terrain=Array.from({length:6},()=>{const a=new Uint8Array(size*size*4);for(let i=0;i<size*size;i++)a[i*4]=i%size<8?48:208;return a;});
  const climate=Array.from({length:6},()=>new Uint8Array(size*size*4));
  const planet=renderer.upload({type:'rock',size,terrain,climate,bytes:48*size*size});
  const mvp=new Float32Array([.8,0,0,0,0,.8,0,0,0,0,.5,0,0,0,0,1]);
  gl.viewport(0,0,96,96);gl.enable(gl.DEPTH_TEST);
  const results=[];
  try{for(const tier of [0,2]){gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);renderer.draw(planet,{mvp,tier,eye:[0,0,-3],light:[.95,0,-.25]});const pixel=new Uint8Array(4);gl.readPixels(48,48,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);results.push({error:gl.getError(),visible:pixel[0]+pixel[1]+pixel[2]>0});}}finally{planet.dispose();renderer.dispose();}
  return results;
 });
 assert.deepEqual(qualityCheck,[{error:0,visible:true},{error:0,visible:true}]);
 const waterCheck=await page.evaluate(async()=>{
 const {createPlanetRenderer}=await import('./renderer.mjs');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});
 const renderer=await createPlanetRenderer(gl),size=8;
 const terrain=Array.from({length:6},()=>{const a=new Uint8Array(size*size*4);for(let i=0;i<a.length;i+=4){a[i]=96;a[i+1]=255;}return a;});
 const climate=Array.from({length:6},()=>new Uint8Array(size*size*4));
 const planet=renderer.upload({type:'aquatic',size,terrain,climate,bytes:48*size*size});
 const mvp=new Float32Array([.8,0,0,0,0,.8,0,0,0,0,.5,0,0,0,0,1]);
 gl.viewport(0,0,64,64);gl.enable(gl.DEPTH_TEST);
 const frames=[];
 try{for(const time of [0,2]){gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);renderer.draw(planet,{mvp,tier:0,time,eye:[0,0,-3],light:[.3,.2,-1],audio:1,delta:.016});const pixels=new Uint8Array(64*64*4);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);frames.push(pixels);}
 return {changed:frames[0].some((v,i)=>v!==frames[1][i]),error:gl.getError(),energy:planet.audioEnergy>0&&planet.audioEnergy<1};
 }finally{planet.dispose();renderer.dispose();}
 });
 assert.deepEqual(waterCheck,{changed:true,error:0,energy:true});
 const cityCheck=await page.evaluate(async()=>{
 const {createPlanetRenderer}=await import('./renderer.mjs');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true}),renderer=await createPlanetRenderer(gl),size=8;
 const terrain=Array.from({length:6},()=>new Uint8Array(size*size*4)),climate=terrain.map(a=>a.slice());
 const planet=renderer.upload({type:'earth',size,terrain,climate,bytes:48*size*size,natural:{grid:8,cities:[{cell:1,dir:[0,0,-1]}],roads:[{cells:[0,1,2]}],bridges:[{cell:1}],vegetation:[{dir:[0,0,-1],kind:'pine'}]}});
 const mvp=new Float32Array([.8,0,0,0,0,.8,0,0,0,0,.5,0,0,0,0,1]);
 gl.viewport(0,0,256,256);gl.enable(gl.DEPTH_TEST);
 try{await planet.loadLandmarks();await planet.loadVegetation();for(const growth of [0,.5,1])renderer.draw(planet,{mvp,tier:2,eye:[0,0,-3],light:[0,0,-1],growth});return {buildings:planet.cityMesh?.buildings,roads:planet.cityMesh?.roads,bridges:planet.cityMesh?.bridges,landmarks:planet.landmarks?.instances,modelBudget:planet.landmarks?.triangles<=12000,plants:planet.vegetation?.instances,error:gl.getError()};}finally{planet.dispose();renderer.dispose();}
 });
 assert.deepEqual(cityCheck,{buildings:9,roads:2,bridges:2,landmarks:1,modelBudget:true,plants:1,error:0});
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
