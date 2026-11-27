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
 visit:()=>{
   guestMode=true;readonly=true;gateHide();if(INTRO.on)introEnd();enterGalaxy();
   const p={...GD.planets[0],gd:false,type:7,id:'violet',name:'Violette',c1:[.78,.7,.32],c2:[.9,.85,.62],ring:2,ringH:.33};
   const system=sanitize({name:'Visite',user:'Visiteur',planets:[p,{...p,id:'terre',type:11,ring:0}]});
   starIgnite=0;window.__pd10Lab.silent=true;jumpTo({s:system,id:'visit-test'});
 },
 land:()=>land(VIEW.planets[0]),
 sample:()=>{if(mode!=='planet'||!curP||curP.r<20)return null;const {x,y,r}=curP;const pixels=[];if(PD_REC_ACTIVE){for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){let a=PD_REC_CTX.getImageData(Math.round(x+i*r*.32),Math.round(y+j*r*.32),1,1).data;pixels.push([...a]);}}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);const a=new Uint8Array(4);for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){gl.readPixels(Math.round(x+i*r*.32),Math.round(H-y-j*r*.32),1,1,gl.RGBA,gl.UNSIGNED_BYTE,a);pixels.push([...a]);}}return pixels;}
};
window.__pd10Status=()=>`);
const observed=instrumented.replace('POST.end(); pdRecoveryPaint();','POST.end(); pdRecoveryPaint(); if(window.__pd10Lab&&mode==="planet"&&curP&&curP.r>30&&mapA>=.98&&Math.abs(cam.yaw-cam.g.yaw)<.06&&window.__pd10Lab.capture){window.__pd10Lab.captureState=window.__pd10Lab.state();window.__pd10Lab.pixels=window.__pd10Lab.sample();window.__pd10Lab.capture=false;}');
assert.notEqual(observed,instrumented);
const visitPage=observed.replace('const check=pdV9Before(o);\n  gl.drawArrays','const check=pdV9Before(o);\n  if(!window.__pd10Lab.silent || (o.kind!==0&&o.kind!==1)) gl.drawArrays')
 .replace('g.drawArrays(g.TRIANGLE_STRIP,0,4);useSP();return true;',`
   const lab=window.__pd10Lab;
   const mid=o.rk?(o.rk[0]+o.rk[1])*.5:0;
   const point=o.rk?{x:o.x+Math.cos(o.roll||0)*mid*o.r,y:o.y+Math.sin(o.roll||0)*mid*o.r}:o;
   const inside=point.x>2&&point.y>2&&point.x<W-2&&point.y<H-2&&o.r>5;
   const pre=new Uint8Array(16),post=new Uint8Array(16);
   const sampled=inside&&pd10TryProbe(point,pre);
   g.drawArrays(g.TRIANGLE_STRIP,0,4);
   if(sampled&&pd10TryProbe(point,post)&&pd10PixelDelta(pre,post)>12){if(o.kind===1)lab.starSeen=true;if(o.rk)lab.ringSeen=true;}
   useSP();return true;`);
assert.notEqual(visitPage,observed);
for(const scenario of ['original V9 materials','Natural World and dual identity','visited system recovers missing star and rings']) test(scenario,{timeout:360000},async()=>{
 const preview=scenario==='Natural World and dual identity',visit=scenario.startsWith('visited');
 const browser=process.env.PD_BROWSER==='webkit'?await webkit.launch({headless:true}):await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const device=devices['iPhone 13'];
 const context=await browser.newContext({...device,serviceWorkers:'block',deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='warning'||msg.type()==='error')console.log('browser',msg.text().slice(0,2000));});
 let basaltNormalRequests=0;
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='pd10.test')return route.abort();if(u.pathname==='/index.html')return route.fulfill({contentType:'text/html',body:visit?visitPage:observed});if(u.pathname==='/assets/cosmic/natural-world-v22/album.rgba')return route.fulfill({path:'.'+u.pathname,contentType:'application/octet-stream'});
 if(/^\/textures(?:84-(?:compact|mobile|hd)|9-(?:mobile|hd))\.bin$/.test(u.pathname))return route.fulfill({path:'.'+u.pathname,contentType:'application/octet-stream'});
 if(u.pathname==='/assets/blender/pbr-512/basalt-normal.png'&&++basaltNormalRequests===1)return route.abort();if(/^\/assets\/blender\/pbr-512\/[a-z]+-(normal|albedo)\.png$/.test(u.pathname))return route.fulfill({path:'.'+u.pathname,contentType:'image/png'});return route.fulfill({status:404,body:''});});
 await page.goto('http://pd10.test/index.html'+(preview?'?identity=preview':''),{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>{try{return window.__pd10Lab?.state().album&&window.__pd10Lab.state().frames>=2;}catch(e){return false;}},{},{timeout:90000,polling:250});
 await page.evaluate(visit=>visit?window.__pd10Lab.visit():window.__pd10Lab.enter(),visit);
 await page.waitForFunction(()=>window.__pd10Lab.state().mode==='system'&&window.__pd10Lab.state().frames>3,{},{timeout:90000,polling:250});
 if(visit){
   await page.waitForFunction(()=>window.__pd10Lab.starSeen&&window.__pd10Lab.state().renderer.renderer==='v9-compact',{},{timeout:120000});
 }
 await page.evaluate(()=>window.__pd10Lab.land());
 await page.waitForFunction(()=>window.__pd10Lab.state().renderer.blenderMaps===5&&window.__pd10Lab.state().renderer.albedoMaps===5&&window.__pd10Lab.state().renderer.atlasActive,{},{timeout:150000}).catch(async e=>{console.log('material timeout',await page.evaluate(()=>window.__pd10Lab.state()));throw e;});
 await page.evaluate(()=>{window.__pd10Lab.capture=true;});
 await page.waitForFunction(()=>window.__pd10Lab.pixels?.length===25,{},{timeout:90000});
 const result=await page.evaluate(()=>({state:window.__pd10Lab.captureState,pixels:window.__pd10Lab.pixels}));
 console.log(JSON.stringify({result,errors}));
 assert.equal(basaltNormalRequests,2,'recover interrupted local normal map');
 assert.deepEqual(errors,[]);
 assert.equal(result.state.renderer.renderer,visit?'v9-compact':'v9');
 if(visit)assert.ok(await page.evaluate(()=>window.__pd10Lab.ringSeen),'ring changes pixels outside the sphere');
 assert.equal(result.state.renderer.albumWorld,preview);
 assert.equal(result.state.renderer.worldDraws>0,preview);
 assert.equal(result.state.renderer.atlasLayers,28);
 assert.equal(result.state.lite,false);assert.equal(result.state.frameErrors,0);
 if(!visit){assert.ok(result.state.renderer.blenderDraws>0,'actual Blender map draw required');assert.ok(result.state.renderer.albedoDraws>0,'actual Blender albedo draw required');}assert.equal(result.state.mode,'planet');assert.ok(result.state.planet.r>30);
 const colors=new Set(result.pixels.filter(p=>p[3]>100).map(p=>p.slice(0,3).join(',')));
 assert.ok(colors.size>=6,'final frame must contain varied visible pixels: '+JSON.stringify(result));
 assert.ok(result.pixels.some(p=>Math.max(...p.slice(0,3))>35),'final frame must not be black');
 }finally{await browser.close();}
});
