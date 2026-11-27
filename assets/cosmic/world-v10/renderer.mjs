import {loadPlanetProgram} from './program.mjs';
import {uploadSphere,SPHERE_LODS} from './sphere.mjs';
import {uploadWorldMaps} from './gpu-maps.mjs';
import {ARCHETYPES,planetProfile} from './archetypes.mjs';
const families=Object.keys(ARCHETYPES);
const tints=[[.18,.45,1],[.12,.65,1],[.45,.38,.3],[1,.25,.08],[.4,.7,1],[.9,.65,.4],[.5,.3,1]];
// Dedicated context or caller-managed GL state. No animation loop is created.
export async function createPlanetRenderer(gl){
 if(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)<2)throw new Error('Two fragment samplers required');
 const p=await loadPlanetProgram(gl),meshes=new Map();let disposed=false;
 return {
 upload(world){if(disposed)throw new Error('Renderer disposed');const profile=planetProfile(world.type),maps=uploadWorldMaps(gl,world);return {maps,profile,family:families.indexOf(world.type),size:world.size,dispose:()=>maps.dispose()};},
 draw(planet,{mvp,eye=[0,0,3],light=[-.45,.35,.82],tier=2,time=0,audio=0}){
 if(disposed||gl.isContextLost())return;
 tier=Math.max(0,Math.min(3,Math.trunc(tier)||0));if(!meshes.has(tier))meshes.set(tier,uploadSphere(gl,...SPHERE_LODS[tier]));
 const mesh=meshes.get(tier),u=p.uniforms;
 gl.useProgram(p.program);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertex);gl.enableVertexAttribArray(p.position);gl.vertexAttribPointer(p.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_CUBE_MAP,planet.maps.terrain);gl.uniform1i(u.uTerrain,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,planet.maps.climate);gl.uniform1i(u.uClimate,1);
 gl.uniformMatrix4fv(u.uMVP,false,mvp);gl.uniform3fv(u.uEye,eye);gl.uniform3fv(u.uLight,light);gl.uniform1i(u.uFamily,planet.family);gl.uniform3fv(u.uAtmosphereTint,tints[planet.family]);gl.uniform1f(u.uAtmosphereDensity,planet.profile.base.atmosphere);gl.uniform1f(u.uRelief,planet.profile.base.relief*.08);gl.uniform1f(u.uTexel,2/planet.size);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uAudio,audio);
 gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
 },
 dispose(){if(!disposed){disposed=true;for(const mesh of meshes.values())mesh.dispose();meshes.clear();p.dispose();}}
 };
}
// Uploaded planets are caller-owned and must be disposed separately.
