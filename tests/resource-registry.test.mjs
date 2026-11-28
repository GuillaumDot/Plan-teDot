// Registre central (Phase A) : chaque fichier listé existe, chaque fichier demandé par V10 y figure, les doublons sont exacts.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {RESOURCES,resourceFiles,resourceForPath,canonicalPath,DUPLICATES,trackResource,registrySnapshot,resetRegistryTracking} from '../assets/cosmic/world-v10/resource-registry.mjs';
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
test('chaque fichier du registre existe sur disque (rien de supposé)',()=>{for(const r of RESOURCES)for(const p of resourceFiles(r))assert.ok(existsSync(p),p);});
test('ids uniques, champs obligatoires présents',()=>{const ids=new Set();for(const r of RESOURCES){assert.ok(!ids.has(r.id),r.id);ids.add(r.id);for(const k of ['dir','type','format','res','dest','deps','gpu','lod','fallback','state','load','licence'])assert.ok(k in r,r.id+' '+k);assert.ok(['utilisée','sous-exploitée','inutilisée'].includes(r.state),r.id);}});
test('tout fichier image ou GLB du pack est couvert par une entrée',()=>{
 const walk=d=>readdirSync(d).flatMap(n=>{const p=d+'/'+n;return statSync(p).isDirectory()?walk(p):[p];});
 const media=[...walk('assets/cosmic'),...walk('assets/blender')].filter(p=>/\.(png|glb|gif|webp)$/.test(p)&&!p.endsWith('natural-world-v22/apercu-graine7.png'));
 const miss=media.filter(p=>!resourceForPath(p));assert.deepEqual(miss,[]);});
test('chaque chemin demandé à l’exécution par V10 est dans le registre et marqué utilisé ou sous-exploité',()=>{
 const rt=JSON.parse(execFileSync('node',['tools/inventaire/runtime-paths.mjs'],{encoding:'utf8'}));
 for(const p of Object.keys(rt)){const r=resourceForPath(p);assert.ok(r,p);assert.notEqual(r.state,'inutilisée',p);}});
test('doublons déclarés identiques au bit près',()=>{for(const [a,b] of Object.entries(DUPLICATES)){assert.equal(sha(a),sha(b),a);assert.equal(canonicalPath(a),b);}});
test('suivi des chargements en mémoire seulement',()=>{resetRegistryTracking();trackResource('assets/cosmic/world/expansion-v14/models/market-01.glb','ready',1000);trackResource('x.png','failed');trackResource('y','bogus');
 const s=registrySnapshot();assert.equal(s.ready,1);assert.equal(s.failed,1);assert.equal(s.bytes,1000);assert.equal(s.byId['v10.living.infra'].ready,1);resetRegistryTracking();});
