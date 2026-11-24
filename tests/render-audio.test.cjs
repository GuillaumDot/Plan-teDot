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
