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
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
