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
