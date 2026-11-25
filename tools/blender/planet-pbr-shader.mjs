// Optional WebGL2 bridge for the existing analytic sphere renderer.
// Figma triplanar color remains untouched. Inject declarations after precision
// and helpers before main; call with the unrotated sphere-space normal and
// rotate the returned normal with the same transform as the original normal.
// Blender UV convention must be verified against a real bake before enabling.
export const planetPBRGLSL = `
uniform sampler2D uPDNormal;
uniform sampler2D uPDRoughness;
uniform float uPDStrength;
uniform float uPDLongitude;
uniform float uPDNormalY;
vec3 pdPBRDetail(vec3 sphereNormal, float lod, float baseRoughness, out float roughness) {
  vec3 n = normalize(sphereNormal);
  roughness = baseRoughness;
  if (uPDStrength <= 0.0) return n;
  float radial = length(n.xz);
  float longitude = atan(n.z, n.x);
  vec2 uv = vec2(fract(longitude / 6.28318530718 + uPDLongitude),
                 asin(clamp(n.y,-1.0,1.0))/3.14159265359 + 0.5);
  vec3 t = radial > 0.0001 ? vec3(-n.z,0.0,n.x)/radial : vec3(1.0,0.0,0.0);
  vec3 b = normalize(cross(t,n));
  vec3 detail = textureLod(uPDNormal,uv,max(0.0,lod)).xyz*2.0-1.0;
  detail.y *= uPDNormalY;
  float weight = clamp(uPDStrength,0.0,1.0)*smoothstep(0.015,0.12,radial);
  roughness = mix(baseRoughness,clamp(textureLod(uPDRoughness,uv,max(0.0,lod)).r,0.08,1.0),weight);
  return normalize(mix(n,normalize(t*detail.x+b*detail.y+n*max(detail.z,0.01)),weight));
}
// Backward-compatible entry point for standalone previews.
vec3 pdPBRSurface(vec3 sphereNormal, float lod, out float roughness) {
  return pdPBRDetail(sphereNormal,lod,0.5,roughness);
}
// Compose detail onto the artistic normal in the same sphere-space frame.
// No displacement, UV mutation or dependency on Claude's breath uniform.
vec3 pdPBRCompose(vec3 sphereNormal, vec3 artisticNormal, float lod,
                  float baseRoughness, out float roughness) {
  vec3 n = normalize(sphereNormal);
  vec3 a = normalize(artisticNormal);
  vec3 d = pdPBRDetail(n,lod,baseRoughness,roughness);
  if (uPDStrength <= 0.0) return a;
  // Shortest-arc rotation maps the radial normal to the artistic normal.
  vec3 v = cross(n,a);
  float c = dot(n,a);
  if (c < -0.999) return a;
  return normalize(d + cross(v,d) + cross(v,cross(v,d))/(1.0+c));
}
float pdPBRBreathRoughness(float roughness, float frontWeight, float signedResponse) {
  return clamp(roughness + clamp(frontWeight,0.0,1.0) *
               clamp(signedResponse,-0.25,0.25),0.08,1.0);
}
`;

// Caller supplies two explicitly reserved units, excluding existing Figma
// units 8–13 and every other unit used by its program. No automatic allocation.
// Keep the lease alive until the draw completes. No asynchronous work in draw.
export function createPlanetPBRBinding(gl, program, units, {reservedUnits=[]}={}) {
  const [normalUnit, roughUnit] = units;
  const max = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  const reserved = new Set([0,1,2,3,8,9,10,11,12,13,14,15,...reservedUnits]);
  if (normalUnit === roughUnit || [normalUnit,roughUnit].some(u =>
    !Number.isInteger(u) || u<0 || u>=max || reserved.has(u))) return null;
  const names = ["uPDNormal","uPDRoughness","uPDStrength","uPDLongitude","uPDNormalY"];
  const loc = Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]));
  if (names.some(n=>loc[n]===null)) return null;
  // Complete neutral textures are needed even when strength is zero.
  const active = gl.getParameter(gl.ACTIVE_TEXTURE);
  const previous = gl.getParameter(gl.TEXTURE_BINDING_2D);
  const neutral = [];
  try {
    for (const rgba of [[128,128,255,255],[128,128,128,255]]) {
      const t=gl.createTexture();
      if (!t) throw new Error("Neutral texture allocation failed");
      neutral.push(t);
      gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(rgba));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    }
  } catch (_) {
    neutral.forEach(t=>gl.deleteTexture(t)); return null;
  } finally { gl.bindTexture(gl.TEXTURE_2D,previous); gl.activeTexture(active); }
  let disposed=false;
  return {
    // draw must be synchronous; program must already be current.
    draw(lease, draw, {strength=0,longitude=0.5,normalY=1}={}) {
      if(disposed || gl.isContextLost()) return draw();
      const oldActive=gl.getParameter(gl.ACTIVE_TEXTURE);
      const old=[];
      const maps=lease?.maps;
      const enabled=maps?.normal && maps?.roughness && Number.isFinite(strength);
      try {
        [normalUnit,roughUnit].forEach((u,i)=>{
          gl.activeTexture(gl.TEXTURE0+u);
          old.push(gl.getParameter(gl.TEXTURE_BINDING_2D));
          gl.bindTexture(gl.TEXTURE_2D,enabled ? (i?maps.roughness:maps.normal) : neutral[i]);
        });
        gl.uniform1i(loc.uPDNormal,normalUnit);
        gl.uniform1i(loc.uPDRoughness,roughUnit);
        gl.uniform1f(loc.uPDStrength,enabled?Math.max(0,Math.min(1,strength)):0);
        gl.uniform1f(loc.uPDLongitude,Number.isFinite(longitude)?longitude:0.5);
        gl.uniform1f(loc.uPDNormalY,normalY<0?-1:1);
        return draw();
      } finally {
        gl.uniform1f(loc.uPDStrength,0);
        old.forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+[normalUnit,roughUnit][i]);gl.bindTexture(gl.TEXTURE_2D,t);});
        gl.activeTexture(oldActive);
      }
    },
    dispose(){if(!disposed){disposed=true;neutral.forEach(t=>gl.deleteTexture(t));}}
  };
}
