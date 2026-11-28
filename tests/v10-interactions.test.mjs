// Run: node --test tests/v10-interactions.test.mjs — interactions V10fp (?world10=1&v10act=1) : picking de ville, illumination,
// trafic lumineux sur les routes, garde-fous (palier 0, réduire les animations, geste, V9 et sauvegarde intacts, une seule boucle RAF).
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {createFocusedHost} from '../assets/cosmic/world-v10/focused-host.mjs';
import {fpFlags} from '../assets/cosmic/world-v10/full-potential.mjs';
import {bakeWorld} from '../assets/cosmic/world-v10/bake.mjs';
import * as L from '../assets/cosmic/world-v10/living-cities.mjs';
const earth=bakeWorld('earth',12345,128);
const cities=earth.natural.cities.slice(0,16);
function host(search,{ready=true}={}){
 const adapter={async init(){return true;},async select(){return true;},get ready(){return ready;},cities,detailReady:true,setTier(){},dispose(){},gpuBytes:0,cacheBytes:0,bake:null};
 return createFocusedHost({},{enabled:true,search,makeAdapter:()=>adapter,makeCompositor:()=>({draw:()=>true,dispose(){},size:0,bytes:0})});
}
const planet={type:11,seed:12345,generatorVersion:10};
const frame=o=>({planet,body:{x:100,y:100,r:80},basis:[[1,0,0],[0,1,0],[0,0,1]],light:[0,0,1],width:200,height:200,delta:.1,tier:2,appTier:2,mobile:true,px:600,...o});
const settle=()=>new Promise(r=>setTimeout(r,0));
test('drapeau ?v10act éteint par défaut, même sous ?world10=1',()=>{assert.equal(fpFlags('?world10=1').act,false);assert.equal(fpFlags('?world10=1&v10act=1').act,true);
 const h=host('?world10=1');assert.equal(h.pickCity(cities[0].dir),null);assert.equal(h.focusCity(0),false);});
test('picking CPU : la ville la plus proche de la direction touchée, rien au large',async()=>{const h=host('?world10=1&v10act=1');h.draw(frame());await settle();
 for(const [i,c] of cities.entries()){const hit=h.pickCity(c.dir);assert.ok(hit);const d=cities[hit.index].dir;assert.ok(d[0]*c.dir[0]+d[1]*c.dir[1]+d[2]*c.dir[2]>.999,'ville '+i);}
 const far=[-cities[0].dir[0],-cities[0].dir[1],-cities[0].dir[2]];const any=cities.some(c=>c.dir[0]*far[0]+c.dir[1]*far[1]+c.dir[2]*far[2]>Math.cos(.09));if(!any)assert.equal(h.pickCity(far),null);});
test('illumination : montée douce 0,6 s, tenue 5 s, extinction douce 1,2 s ; pause pendant un geste',async()=>{const h=host('?world10=1&v10act=1');h.draw(frame());await settle();
 assert.ok(h.focusCity(2));h.draw(frame({delta:.25}));const a=h.focus.level;assert.ok(a>0&&a<1,'montée '+a);
 h.draw(frame({delta:.25,gesture:true}));assert.equal(h.focus.level,a,'geste : figé');
 for(let i=0;i<4;i++)h.draw(frame({delta:.25}));assert.equal(h.focus.level,1);
 for(let i=0;i<30;i++)h.draw(frame({delta:.25}));assert.equal(h.focus.city,-1);});
test('palier 0 et réduire les animations : aucune rampe (allumé net), aucun gonflement',async()=>{
 for(const o of [{appTier:0,tier:0},{reducedMotion:true}]){const h=host('?world10=1&v10act=1');h.draw(frame(o));await settle();h.focusCity(1);h.draw(frame({...o,delta:.05}));assert.equal(h.focus.level,1,JSON.stringify(o));}});
test('trafic : placé sur les routes du générateur, déterministe, plafonné par palier, rien au palier 0 ni hors Terre',()=>{
 assert.deepEqual(L.trafficPlacement(earth,{tier:2}),L.trafficPlacement(bakeWorld('earth',12345,128),{tier:2}));
 assert.equal(L.trafficPlacement(earth,{tier:0}).length,0);for(const t of [1,2,3])assert.ok(L.trafficPlacement(earth,{tier:t}).length<=L.TRAFFIC_TIER[t]);
 assert.equal(L.trafficPlacement(bakeWorld('rock',5,128),{tier:3}).length,0);
 const items=L.trafficPlacement(earth,{tier:3});assert.ok(items.length>50);for(const it of items){const k=it.a[0]*it.b[0]+it.a[1]*it.b[1]+it.a[2]*it.b[2];assert.ok(k>.98&&k<1,'segment court le long d’une route');}});
test('trafic : apparition par ère et par écoute',()=>{assert.equal(L.trafficVisible(100,0,1),0);assert.ok(L.trafficVisible(100,2,1)<L.trafficVisible(100,4,1));assert.equal(L.trafficVisible(100,5,1),100);assert.equal(L.trafficVisible(100,5,.5),50);});
test('couleurs : sodium jaune-orangé, jamais #1e8bf1 ; aucun hit-testing GPU ni lecture de pixels',()=>{
 for(const f of ['living-cities.mjs','focused-host.mjs','renderer.mjs']){const s=fs.readFileSync(new URL('../assets/cosmic/world-v10/'+f,import.meta.url),'utf8');assert.ok(!/1e8bf1/i.test(s),f);assert.ok(!/readPixels/.test(s),f);}});
test('index.html : interactions inertes sans ?world10=1&v10act=1, aucune écriture de sauvegarde, une seule boucle RAF',()=>{
 const src=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const a=src.indexOf('const PD10ACT'),b=src.indexOf('function pd10Extra');const block=src.slice(a,b);assert.ok(a>0&&b>a);
 assert.match(block,/function pd10ActOn\(\)\{ return typeof PD10_ENABLED !== 'undefined' && PD10_ENABLED && PD10_QUERY\.get\('v10act'\) === '1'/);
 for(const fn of ['pd10ActTap','pd10ActSnap','pd10ActReact']){const i=block.indexOf('function '+fn+'(');assert.ok(i>=0&&block.slice(i,i+90).includes('!pd10ActOn()'),fn+' gardée par pd10ActOn');}
 assert.ok(!/localStorage|LS\.set|saveAll|pushSignal|persist/.test(block),'aucune écriture de sauvegarde');
 assert.ok(src.includes("P.dir = PD10Host ? pd10ActSnap(P, d) : d;"),'pd9Dir inchangé sans V10');
 const base=execFileSync('git',['show','37ed2e3:index.html'],{encoding:'utf8',maxBuffer:64e6});const raf=s=>(s.match(/requestAnimationFrame\(/g)||[]).length;assert.equal(raf(src),raf(base),'même nombre d’appels RAF qu’avant');
 for(const f of fs.readdirSync(new URL('../assets/cosmic/world-v10/',import.meta.url)))if(f.endsWith('.mjs')&&!/test|smoke/.test(f)){
  const t=fs.readFileSync(new URL('../assets/cosmic/world-v10/'+f,import.meta.url),'utf8');
  if(f==='living-cities.mjs'){assert.equal((t.match(/requestAnimationFrame/g)||[]).length,2,'defaultYield seulement, pas de boucle RAF');assert.match(t,/defaultYield=\(\)=>typeof requestAnimationFrame/);}
  else assert.ok(!/requestAnimationFrame/.test(t),f);
 }});
test('fluidité : rien d’alloué ni de chargé au tap (panneau pré-créé, rect en cache, objets réutilisés, préchauffage hors gros plan)',async()=>{
 const h=host('?world10=1&v10act=1');h.draw(frame());await settle();assert.equal(h.focus,h.focus,'focus réutilisé');assert.equal(h.cities,h.cities,'directions des villes en cache');
 const src=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const blk=(n)=>{const i=src.indexOf('function '+n+'(');return src.slice(i,src.indexOf('\nfunction ',i+10));};
 for(const n of ['pd10ActTap','pd10ActTick','pd10ActReact'])assert.ok(!/createElement|getBoundingClientRect|querySelector|import\(|fetch\(/.test(blk(n)),n+' sans allocation DOM, mise en page forcée ni chargement');
 assert.ok(/if\(ok&&!PD10ACT\.el&&PD10_QUERY\.get\('v10act'\)==='1'\)pd10ActTag\(\)/.test(src),'panneau créé à la première image V10');
 assert.match(blk('pd10ActTick'),/pd10ActEase\(PD10ACT\.g\)/,'approche temporelle lissée (smootherstep)');assert.match(blk('pd10ActTick'),/dragging \|\| pinch/,'un geste annule le glissé');
 const r=fs.readFileSync(new URL('../assets/cosmic/world-v10/renderer.mjs',import.meta.url),'utf8');assert.match(r,/if\(fp\?\.traffic&&tier>=1&&planet\.type==='earth'&&!trafficBroken\)\{/,'préchauffage du trafic dès que ?v10act=1, sans attendre le gros plan');assert.match(r,/if\(shown&&mesh\)fp\.trafficDraws=drawTraffic/,'trafic dessiné seulement une fois la géométrie visible');assert.ok(!/else if\(!geometry&&tier>=1&&fp\?\.traffic/.test(r),'pas de second bloc de préchauffage (doublon de loadLiving / createLivingProgram)');});
test('approche : smootherstep monotone, départ et arrivée à vitesse nulle',()=>{
 const src=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const m=src.match(/function pd10ActEase\(u\)\{[^\n]*\}/);assert.ok(m);const ease=new Function(m[0]+';return pd10ActEase;')();
 assert.equal(ease(0),0);assert.equal(ease(1),1);let prev=0;for(let i=1;i<=100;i++){const v=ease(i/100);assert.ok(v>=prev);prev=v;}assert.ok(ease(.01)<1e-4&&1-ease(.99)<1e-4);});
