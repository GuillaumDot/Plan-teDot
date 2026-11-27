import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8080';
const raw=readFileSync(new URL('../../../index.html',import.meta.url),'utf8');
function patch(s,a,b){assert.ok(s.includes(a)&&s.indexOf(a)===s.lastIndexOf(a),'Missing or ambiguous test hook: '+a);return s.replace(a,b);}
// This instrumented HTML is served ONLY inside an isolated browser test.
// No test hooks are added to the deployed application.
const fixture=`window.__pdAppSmoke={
  setup(versioned=false){
    pdStopFrame();guestMode=true;remoteReady=false;authUser=null;ME=null;
    SYS=fixSys(defaultSystem());SYS.name='Fixture';SYS.user='Fixture';
    const p=makePlanet('Fixture',11,{seed:7,auto:false,ring:0});
    if(!versioned)delete p.generatorVersion;
    SYS.planets=[p];VIEW=SYS;readonly=true;
    enterSystem(SYS,true);land(p);pdStopFrame();
    const fresh=makePlanet('Version check',11);const publicVersion=sanitize(snapshot()).planets[0].generatorVersion;
    return {version:p.generatorVersion??null,seed:p.seed,newVersion:fresh.generatorVersion,publicVersion};
  },
  tick(){frame(performance.now(),true);return {state:pd10Status(),draws:window.__pdSmokeDraws||0,mode,seed:VIEW.planets[0]?.seed,version:VIEW.planets[0]?.generatorVersion??null,error:gl.getError(),recovery:PD_REC_ACTIVE};},
  leave(){backToSystem();pdStopFrame();frame(performance.now(),true);return pd10Status();},
  fail(){PD10Host?.contextLost();return pd10Status();},
  playFixture(){
    const rate=16000,n=rate*20,data=new ArrayBuffer(44+n*2),d=new DataView(data);
    const str=(i,s)=>{for(let j=0;j<s.length;j++)d.setUint8(i+j,s.charCodeAt(j));};
    str(0,'RIFF');d.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,rate,true);d.setUint32(28,rate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);str(36,'data');d.setUint32(40,n*2,true);
    for(let i=0;i<n;i++)d.setInt16(44+i*2,Math.round(1200*Math.sin(2*Math.PI*220*i/rate)),true);
    const p=VIEW.planets[0],id='fixture-audio';
    TRACKS.set(id,{id,title:'Fixture',artist:'Test',dur:20,blob:new Blob([data],{type:'audio/wav'}),src:{k:'local'}});
    p.tracks=[id];playList([id],0,p.id);
  },
  audio(){return {time:au.currentTime,paused:au.paused,id:Q[qi],error:au.error?.code??0};},
  pause(){au.pause();},
  resume(){return au.play();}

};\n`;
let html=patch(raw,'if(ok)pd9OccAdd(b);','if(ok){window.__pdSmokeDraws=(window.__pdSmokeDraws||0)+1;pd9OccAdd(b);}');
html=patch(html,'/* ---------- ?perf=1 : a small live meter',fixture+'/* ---------- ?perf=1 : a small live meter');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 // No real authentication, telemetry, media services, or database writes.
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base)return route.abort();if(u.pathname==='/index.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:html});return route.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html?world10=1&world10preview=1&advanced=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>!!window.__pdAppSmoke,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>window.__pdAppSmoke.setup()),{version:null,seed:7,newVersion:10,publicVersion:0});
 let result;
 for(let i=0;i<100;i++){result=await page.evaluate(()=>window.__pdAppSmoke.tick());if(result.draws>0||result.state==='fallback')break;await page.waitForTimeout(100);}
 assert.ok(result.draws>0,'V10 did not draw through actual application: '+JSON.stringify(result));
 assert.equal(result.error,0);assert.equal(result.mode,'planet');assert.equal(result.seed,7);assert.equal(result.version,null);
 await page.screenshot({path:'v10-app-focus.png'});
 assert.equal(await page.evaluate(()=>window.__pdAppSmoke.leave()),'idle');
 // The same fixture can return to the historic renderer on an injected failure.
 assert.deepEqual(await page.evaluate(()=>window.__pdAppSmoke.setup(true)),{version:10,seed:7,newVersion:10,publicVersion:10});
 for(let i=0;i<100;i++){result=await page.evaluate(()=>window.__pdAppSmoke.tick());if(result.state==='ready'||result.state==='fallback')break;await page.waitForTimeout(100);}
 assert.equal(result.state,'ready');
 await page.evaluate(()=>window.__pdAppSmoke.playFixture());
 await page.waitForFunction(()=>window.__pdAppSmoke.audio().time>.25&&!window.__pdAppSmoke.audio().paused,null,{timeout:15000});
 const before=await page.evaluate(()=>window.__pdAppSmoke.audio());assert.equal(before.id,'fixture-audio');assert.equal(before.error,0);
 assert.equal(await page.evaluate(()=>window.__pdAppSmoke.fail()),'fallback');
 await page.waitForFunction(t=>window.__pdAppSmoke.audio().time>t+.25&&!window.__pdAppSmoke.audio().paused,before.time,{timeout:10000});
 const after=await page.evaluate(()=>window.__pdAppSmoke.audio());assert.equal(after.id,before.id);assert.equal(after.error,0);
 await page.evaluate(()=>window.__pdAppSmoke.pause());const paused=await page.evaluate(()=>window.__pdAppSmoke.audio());assert.equal(paused.paused,true);
 await page.evaluate(()=>window.__pdAppSmoke.resume());await page.waitForFunction(t=>window.__pdAppSmoke.audio().time>t+.15,paused.time,{timeout:10000});
 await page.evaluate(()=>window.__pdAppSmoke.pause());
 console.log('Synthetic local WAV through playList, playback continuity across graphics fallback and pause/resume verified');
 const fallback=await page.evaluate(()=>window.__pdAppSmoke.tick());assert.equal(fallback.state,'fallback');assert.equal(fallback.error,0);assert.equal(fallback.mode,'planet');assert.equal(fallback.version,10);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'v10-app-fallback.png'});
 console.log('Actual index focus, ephemeral version, leave and legacy fallback verified');
 await context.close();
}finally{await browser.close();}
