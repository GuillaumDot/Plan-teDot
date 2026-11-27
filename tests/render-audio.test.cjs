// Run: node --test tests/render-audio.test.cjs
// Executes the actual isolated production functions, not a copy of their logic.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function source(name){
 const lines=html.split(/\r?\n/).filter(l=>l.startsWith('function '+name+'('));
 assert.equal(lines.length,1,'Expected one production function: '+name);
 return lines[0];
}
function setup(){
 let now=0,id=0; const pending=new Map(), drawn=[];
 const c=vm.createContext({running:true,document:{hidden:false},pdContextLost:false,pdFrameRequest:null,auFadeGeneration:0,au:{volume:1},performance:{now:()=>now},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),frameSafe:t=>drawn.push(t),requestAnimationFrame:f=>{pending.set(++id,f);return id;},cancelAnimationFrame:i=>pending.delete(i)});
 vm.runInContext(['pdQueueFrame','pdStopFrame','auFade'].map(source).join('\n'),c);
 return {c,pending,drawn,tick(t){now=t;const batch=[...pending];for(const [i,f] of batch){if(pending.delete(i))f(t);}}};
}
test('render requests coalesce and resume after stop',()=>{const {c,pending,drawn,tick}=setup();c.pdQueueFrame();c.pdQueueFrame();assert.equal(pending.size,1);c.pdStopFrame();assert.equal(pending.size,0);tick(10);assert.deepEqual(drawn,[]);c.running=true;c.pdQueueFrame();tick(20);assert.deepEqual(drawn,[20]);assert.equal(c.pdFrameRequest,null);});
test('hidden or lost WebGL context prevents drawing',()=>{const {c,pending,drawn,tick}=setup();c.document.hidden=true;c.pdQueueFrame();assert.equal(pending.size,0);c.document.hidden=false;c.pdQueueFrame();c.pdContextLost=true;tick(10);assert.deepEqual(drawn,[]);c.pdQueueFrame();assert.equal(pending.size,0);c.pdContextLost=false;c.pdQueueFrame();tick(20);assert.deepEqual(drawn,[20]);});
test('new audio fade supersedes pending fade',()=>{const {c,pending,tick}=setup();c.auFade(0,1);tick(500);assert.equal(c.au.volume,.5);c.auFade(1,1);tick(1000);assert.equal(c.au.volume,.75);tick(1500);assert.equal(c.au.volume,1);assert.equal(pending.size,0);});
test('instant fade cancels older fade and clamps volume',()=>{const {c,pending,tick}=setup();c.auFade(0,1);c.auFade(2,0);assert.equal(c.au.volume,1);tick(500);assert.equal(c.au.volume,1);assert.equal(pending.size,0);c.auFade(-1,0);assert.equal(c.au.volume,0);});

test('stopped renderer ignores a callback already dispatched by the browser',()=>{const {c,pending,drawn}=setup();c.pdQueueFrame();const callback=[...pending.values()][0];c.pdStopFrame();callback(30);assert.deepEqual(drawn,[]);assert.equal(c.pdFrameRequest,null);});
test('fade completes after a long scheduling gap without overshoot',()=>{const {c,pending,tick}=setup();c.auFade(.2,1);tick(60000);assert.ok(Math.abs(c.au.volume-.2)<1e-9);assert.equal(pending.size,0);});
test('rapid fade replacements leave only the latest target effective',()=>{const {c,pending,tick}=setup();c.auFade(0,1);c.auFade(.4,1);c.auFade(.8,1);tick(1000);assert.ok(Math.abs(c.au.volume-.8)<1e-9);assert.equal(pending.size,0);});

// Atlas selection and fallback execute the production code, including corrupted headers.
function asyncSource(name){const lines=html.split(/\r?\n/).filter(l=>l.startsWith('async function '+name+'('));assert.equal(lines.length,1);return lines[0];}
test('mobile 512 atlas from tier 1, compact only at tier 0 or in-app browsers, ordered desktop fallback',()=>{const c=vm.createContext({});vm.runInContext(source('pdAtlasCandidates'),c);assert.equal(c.pdAtlasCandidates(1,true,false).join(','),'textures84-mobile.bin,textures84-compact.bin');assert.equal(c.pdAtlasCandidates(0,true,false).join(','),'textures84-compact.bin');assert.equal(c.pdAtlasCandidates(1,true,false,true).join(','),'textures84-compact.bin');assert.equal(c.pdAtlasCandidates(1,true,false,false).join(','),'textures84-mobile.bin,textures84-compact.bin');assert.equal(c.pdAtlasCandidates(2,false,true).join(','),'textures84-hd.bin,textures84-mobile.bin,textures84-compact.bin');for(const f of c.pdAtlasCandidates(2,false,true))assert.ok(fs.existsSync(path.join(__dirname,'..',f)),f);});
test('atlas loader recovers from failed network and corrupt header',async()=>{const attempts=[];const c=vm.createContext({console:{warn(){}},pd96Get:async file=>{attempts.push(file);if(file==='hd')throw Error('404');return file;},pdAtlasHeader:buf=>{if(buf==='mobile')throw Error('header');return {H:{sz:256},base:8};}});vm.runInContext(asyncSource('pdAtlasLoad'),c);const r=await c.pdAtlasLoad(['hd','mobile','compact'],[]);assert.equal(r.H.sz,256);assert.deepEqual(attempts,['hd','mobile','compact']);await assert.rejects(c.pdAtlasLoad(['hd','mobile'],[]),/header/);});
test('cosmic inventory has no missing paths or archive entries',()=>{const dir=path.join(__dirname,'..','assets','cosmic');const entries=JSON.parse(fs.readFileSync(path.join(dir,'asset-inventory.json'),'utf8'));assert.ok(entries.length>0);const seen=new Set();for(const e of entries){assert.ok(!e.path.startsWith('archive_reference/'));assert.ok(!seen.has(e.path),e.path);seen.add(e.path);assert.ok(fs.existsSync(path.join(dir,e.path)),e.path);}});

// V10 « plein potentiel » : helpers purs (assets/cosmic/world-v10/full-potential.mjs).
const fpUrl=require('url').pathToFileURL(path.join(__dirname,'..','assets','cosmic','world-v10','full-potential.mjs')).href;
test('v10fp tiers: app tier to V10 tier, cache per tier, flags default on, one flag off',async()=>{const m=await import(fpUrl);
 assert.deepEqual([0,1,2].map(t=>m.v10Tier(t,true)),[0,1,2]);assert.equal(m.v10Tier(2,false),3);
 assert.deepEqual([0,1,2,3].map(m.cacheWorldsForTier),[0,2,2,4]);assert.deepEqual([0,1,2,3].map(t=>m.targetFpsForTier(t)),[30,60,60,60]);assert.equal(m.targetFpsForTier(2,true),30);
 const f=m.fpFlags('?world10=1&v10pbr=0');assert.equal(f.pbr,false);assert.equal(f.pal,true);assert.equal(f.lod,true);
 for(const r of m.budgetTable())assert.ok(r.fits,'GPU budget tier '+r.tier);});
test('v10fp LOD: thresholds 64/256 px with 15 % hysteresis, frozen during a gesture',async()=>{const m=await import(fpUrl);
 assert.equal(m.lodLevel(null,50),0);assert.equal(m.lodLevel(null,100),1);assert.equal(m.lodLevel(null,300),2);
 assert.equal(m.lodLevel(1,260),1);assert.equal(m.lodLevel(1,300),2);assert.equal(m.lodLevel(2,240),2);assert.equal(m.lodLevel(2,210),1);
 assert.equal(m.lodLevel(0,70),0);assert.equal(m.lodLevel(1,58),1);assert.equal(m.lodLevel(1,50),0);
 assert.equal(m.lodLevel(2,10,true),2);let l=null,flips=0;for(let i=0;i<200;i++){const n=m.lodLevel(l,256+Math.sin(i)*20);if(l!==null&&n!==l)flips++;l=n;}assert.ok(flips<=1,'no flicker around 256 px');});
// Dot Son & Com §6 : les 5 tests audio.
test('v10fp audio 1: number or object input, always bounded 0..1 (NaN, Infinity)',async()=>{const m=await import(fpUrl);
 for(const input of [.5,NaN,Infinity,-3,{bass:NaN,mid:Infinity,high:-1,level:2,kick:9,kickAge:0,live:1}]){const s=m.audioPacket(input,{},1/60);for(const k of ['bass','mid','high','level','kick'])assert.ok(s[k]>=0&&s[k]<=1,k+' '+s[k]);}});
test('v10fp audio 2: kicks every 250 ms give at most 3 flashes per second',async()=>{const m=await import(fpUrl);
 let s={},flashes=0,last=-1;for(let f=0;f<600;f++){const t=f/60,age=t%.25;const kick=age<1/60?1:0;s=m.audioPacket({level:.6,bass:.6,kick,kickAge:kick?0:age,live:1},s,1/60);if(s.lastFlash!==last){if(last>-1||s.lastFlash>=0)flashes++;last=s.lastFlash;}}
 assert.ok(flashes<=31,'flashes in 10 s: '+flashes);assert.ok(flashes>=20);});
test('v10fp audio 3: reduce motion = no kick, light capped at +20 %, reactivity off/soft/full',async()=>{const m=await import(fpUrl);
 const loud={bass:1,mid:1,high:1,level:1,kick:1,kickAge:0,live:1};const s=m.audioPacket(loud,{},1/60,{reducedMotion:true});assert.equal(s.kick,0);assert.ok(m.cityLightGain(s,1)<=1.2+1e-9);
 assert.equal(m.audioPacket(loud,{},1/60,{reactivity:'off'}).bass,0);assert.equal(m.audioPacket(loud,{},1/60,{reactivity:'soft'}).bass,.5);assert.equal(m.defaultReactivity(true),'soft');
 assert.equal(m.cityLightGain(m.audioPacket(loud,{},1/60),0),1,'no city pulse on the day side');assert.deepEqual(m.particleBudget(0),{count:0,audio:false});assert.equal(m.particleBudget(1).audio,false);});
test('v10fp audio 4: live=0 brings city emission back to rest in under 0.6 s',async()=>{const m=await import(fpUrl);
 let s=m.audioPacket({bass:1,mid:1,high:1,level:1,kick:1,kickAge:0,live:1},{},1/60);for(let i=0;i<36;i++)s=m.audioPacket({live:0},s,1/60);
 const emission=1+.12*s.bass+.08*s.kick;assert.ok(emission-1<.01,'emission '+emission);});
test('v10fp audio 5: no createMediaElementSource on the music element',()=>{assert.doesNotMatch(html,/createMediaElementSource\(\s*au\s*\)/);});
test('v10fp cities grow only while the planet track plays, never shrink',async()=>{const m=await import(fpUrl);
 let g=m.cityGrowth(0,{floor:.2});assert.equal(g,.2);g=m.cityGrowth(g,{floor:.2,playing:true,dt:.1});assert.ok(g>.2);const h=m.cityGrowth(g,{floor:.2,playing:false,dt:10});assert.equal(h,g);
 assert.equal(m.cityGrowth(.3,{playing:true,reducedMotion:true}),1);});
