import {ART_PROFILES} from './art-direction-profiles.mjs';
import {MASK_SHADER,planMasks,loadMasks} from './cosmic-textures.mjs';
const PLANET_CHUNKS={cosmicArtProfilesV1:['atmosphere','volcanic']};
export function createCosmicPlanet(gl,session){
  if(!session||!gl.createVertexArray)return null;
  const names=Object.entries(PLANET_CHUNKS).flatMap(([flag,keys])=>session.flags[flag]?keys:[]);
  if(!names.length||gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)<9)return null;
  const masks=planMasks(session.flags,session.tier),abort=new AbortController();
  let atlas=null;
  const defs=names.map(n=>'#define PD_'+n.toUpperCase().replaceAll('-','_')+' 1').join('\n');
  const header=defs+'\n'+masks.defs+'\n'+MASK_SHADER+'\nuniform vec3 uCosmicEnv,uArtTint; uniform vec4 uArt; uniform float uCosmicTier,uReliefReady; uniform sampler2D uReliefHN,uReliefAO;\n'+names.map(k=>session.sources[k]).join('\n');
  const reserved=masks.bytes>0 && session.reserve(masks.bytes);
  if(reserved){
    loadMasks(gl,masks,abort.signal).then(value=>{if(abort.signal.aborted)value?.dispose();else atlas=value;}).catch(e=>{if(!abort.signal.aborted)console.warn('Cosmic masks:',e.message);});
  }
  return {header,names,plan(type){const p=session.resolveGeminiRenderPlan(type,session.tier,session.flags);
      return {profile:ART_PROFILES[p.family],relief:type==='volcanic'?session.pool.acquire('volcan'):null};},
    release(planet){if(planet?.relief)session.pool.release('volcan');},
    bind(u,planet,tier,neutral,fp){
      const data=planet.cosmic,profile=data.profile,relief=data.relief;
      gl.uniform3fv(u.uCosmicEnv,session.envelope);gl.uniform3fv(u.uArtTint,profile.tint);
      gl.uniform4f(u.uArt,profile.density,profile.roughness,profile.drift,0);
      gl.uniform1f(u.uCosmicTier,tier);gl.uniform1f(u.uCosmicMasksReady,atlas?1:0);
      gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,atlas?.texture??neutral);gl.uniform1i(u.uCosmicMasks,4);
      gl.uniform1f(u.uReliefReady,relief?.ready?1:0);
      gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,relief?.textures[0]??neutral);gl.uniform1i(u.uReliefHN,5);
      gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,relief?.textures[1]??neutral);gl.uniform1i(u.uReliefAO,6);
    },dispose(){abort.abort();atlas?.dispose();if(masks.bytes&&reserved)session.release(masks.bytes);}
  };
}
