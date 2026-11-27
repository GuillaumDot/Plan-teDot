// Offline integration test: execute the shipped page with a test-only observation hook.
// No real accounts, external APIs, or changes to the production HTML.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit,devices}=require('playwright');
const html=fs.readFileSync('index.html','utf8');
const marker='window.__pd10Status=()=>';
assert.equal(html.split(marker).length,2);
const instrumented=html.replace(marker,`
window.__pd10Lab={
 state:()=>({mode,frames:window.__pdF||0,frameErrors:FERR,album:!!GD,lite:!!document.getElementById('pdLite'),renderer:window.__pd10Status(),planet:curP?{x:curP.x,y:curP.y,r:curP.r}:null,W,H}),
 enter:()=>{if(!GD)throw Error('album not ready');guestMode=true;readonly=true;gateHide();if(INTRO.on)introEnd();enterSystem(GD,true,GD_ID);},
 land:()=>land(GD.planets[0]),
 sample:()=>{if(mode!=='planet'||!curP||curP.r<20)return null;const {x,y,r}=curP;const pixels=[];if(PD_REC_ACTIVE){for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){let a=PD_REC_CTX.getImageData(Math.round(x+i*r*.12),Math.round(y+j*r*.12),1,1).data;pixels.push([...a]);}}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);const a=new Uint8Array(4);for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){gl.readPixels(Math.round(x+i*r*.12),Math.round(H-y-j*r*.12),1,1,gl.RGBA,gl.UNSIGNED_BYTE,a);pixels.push([...a]);}}return pixels;}
};
window.__pd10Status=()=>`);
const observed=instrumented.replace('POST.end(); pdRecoveryPaint();','POST.end(); pdRecoveryPaint(); if(window.__pd10Lab&&mode==="planet"&&curP&&curP.r>30&&window.__pd10Lab.capture){window.__pd10Lab.pixels=window.__pd10Lab.sample();window.__pd10Lab.capture=false;}');
assert.notEqual(observed,instrumented);
test('complete application boots, enters album system and renders a planet on mobile viewport',{timeout:180000},async()=>{
 const browser=process.env.PD_BROWSER==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const device=devices['iPhone 13'];
 const context=await browser.newContext({...device,serviceWorkers:'block',deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 let basaltNormalRequests=0;
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='pd10.test')return route.abort();if(u.pathname==='/index.html')return route.fulfill({contentType:'text/html',body:observed});if(u.pathname==='/assets/blender/pbr-512/basalt-normal.png'&&++basaltNormalRequests===1)return route.abort();if(/^\/assets\/blender\/pbr-512\/[a-z]+-(normal|albedo)\.png$/.test(u.pathname))return route.fulfill({path:'.'+u.pathname,contentType:'image/png'});return route.fulfill({status:404,body:''});});
 await page.goto('http://pd10.test/index.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{try{return window.__pd10Lab?.state().album&&window.__pd10Lab.state().frames>=2;}catch(e){return false;}},{},{timeout:45000});
 await page.evaluate(()=>window.__pd10Lab.enter());
 await page.waitForFunction(()=>window.__pd10Lab.state().mode==='system'&&window.__pd10Lab.state().frames>3,{},{timeout:25000});
 await page.waitForFunction(()=>window.__pd10Lab.state().renderer.blenderMaps===5&&window.__pd10Lab.state().renderer.albedoMaps===5,{},{timeout:75000}).catch(async e=>{console.log('material timeout',await page.evaluate(()=>window.__pd10Lab.state()));throw e;});
 await page.evaluate(()=>{window.__pd10Lab.land();window.__pd10Lab.capture=true;});
 await page.waitForFunction(()=>window.__pd10Lab.pixels?.length===25,{},{timeout:35000});
 const result=await page.evaluate(()=>({state:window.__pd10Lab.state(),pixels:window.__pd10Lab.pixels}));
 console.log(JSON.stringify({result,errors}));
 assert.equal(basaltNormalRequests,2,'recover interrupted local normal map');
 assert.equal(result.state.lite,false);assert.equal(result.state.frameErrors,0);
 assert.ok(result.state.renderer.blenderDraws>0,'actual Blender map draw required');assert.ok(result.state.renderer.albedoDraws>0,'actual Blender albedo draw required');assert.equal(result.state.mode,'planet');assert.ok(result.state.planet.r>30);
 const colors=new Set(result.pixels.filter(p=>p[3]>100).map(p=>p.slice(0,3).join(',')));
 assert.ok(colors.size>=6,'final frame must contain varied visible pixels: '+JSON.stringify(result));
 assert.ok(result.pixels.some(p=>Math.max(...p.slice(0,3))>35),'final frame must not be black');
 }finally{await browser.close();}
});
