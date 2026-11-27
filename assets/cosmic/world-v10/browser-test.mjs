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
 await page.waitForTimeout(200);
 const result=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl');return new Promise(resolve=>requestAnimationFrame(()=>{const pixel=new Uint8Array(4);gl.readPixels(c.width>>1,c.height>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);resolve({error:gl.getError(),pixel:[...pixel]});}));});
 assert.equal(result.error,0,type);assert.ok(result.pixel.slice(0,3).some((v,i)=>Math.abs(v-[6,9,18][i])>4),type+' appears blank');
 await page.screenshot({path:'v10-'+type+'.png'});
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
