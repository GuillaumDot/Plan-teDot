import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8080';
const raw=readFileSync(new URL('../../../index.html',import.meta.url),'utf8');
function patch(s,a,b){assert.ok(s.includes(a)&&s.indexOf(a)===s.lastIndexOf(a),'Missing or ambiguous test hook: '+a);return s.replace(a,b);}
// This instrumented HTML is served ONLY inside an isolated browser test.
// No test hooks are added to the deployed application.
const fixture=`window.__pdAppSmoke={
  setup(){
    pdStopFrame();guestMode=true;remoteReady=false;authUser=null;ME=null;
    SYS=fixSys(defaultSystem());SYS.name='Fixture';SYS.user='Fixture';
    const p=makePlanet('Fixture',11,{seed:7,auto:false,ring:0});
    SYS.planets=[p];VIEW=SYS;readonly=true;
    enterSystem(SYS,true);land(p);pdStopFrame();
    return {version:p.generatorVersion??null,seed:p.seed};
  },
  tick(){frame(performance.now(),true);return {state:pd10Status(),draws:window.__pdSmokeDraws||0,mode,seed:VIEW.planets[0]?.seed,version:VIEW.planets[0]?.generatorVersion??null,error:gl.getError(),recovery:PD_REC_ACTIVE};},
  leave(){backToSystem();pdStopFrame();frame(performance.now(),true);return pd10Status();},
  fail(){PD10Host?.contextLost();return pd10Status();}
};\n`;
let html=patch(raw,'if(ok)pd9OccAdd(b);','if(ok){window.__pdSmokeDraws=(window.__pdSmokeDraws||0)+1;pd9OccAdd(b);}');
html=patch(html,'/* ---------- ?perf=1 : a small live meter',fixture+'/* ---------- ?perf=1 : a small live meter');
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 // No real authentication, telemetry, media services, or database writes.
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base)return route.abort();if(u.pathname==='/index.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:html});return route.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html?world10=1&world10preview=1&advanced=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>!!window.__pdAppSmoke,{timeout:90000});
 assert.deepEqual(await page.evaluate(()=>window.__pdAppSmoke.setup()),{version:null,seed:7});
 let result;
 for(let i=0;i<100;i++){result=await page.evaluate(()=>window.__pdAppSmoke.tick());if(result.draws>0||result.state==='fallback')break;await page.waitForTimeout(100);}
 assert.ok(result.draws>0,'V10 did not draw through actual application: '+JSON.stringify(result));
 assert.equal(result.error,0);assert.equal(result.mode,'planet');assert.equal(result.seed,7);assert.equal(result.version,null);
 await page.screenshot({path:'v10-app-focus.png'});
 assert.equal(await page.evaluate(()=>window.__pdAppSmoke.leave()),'idle');
 // The same fixture can return to the historic renderer on an injected failure.
 await page.evaluate(()=>window.__pdAppSmoke.setup());
 for(let i=0;i<100;i++){result=await page.evaluate(()=>window.__pdAppSmoke.tick());if(result.state==='ready'||result.state==='fallback')break;await page.waitForTimeout(100);}
 assert.equal(result.state,'ready');
 assert.equal(await page.evaluate(()=>window.__pdAppSmoke.fail()),'fallback');
 const fallback=await page.evaluate(()=>window.__pdAppSmoke.tick());assert.equal(fallback.state,'fallback');assert.equal(fallback.error,0);assert.equal(fallback.mode,'planet');assert.equal(fallback.version,null);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'v10-app-fallback.png'});
 console.log('Actual index focus, ephemeral version, leave and legacy fallback verified');
 await context.close();
}finally{await browser.close();}
