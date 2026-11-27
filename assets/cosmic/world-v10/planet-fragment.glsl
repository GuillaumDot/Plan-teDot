// Concatenate after precision declaration, materials.glsl and relief-atmosphere.glsl.
varying vec3 vDirection;
uniform samplerCube uTerrain;
uniform samplerCube uClimate;
uniform sampler2D uDetail;
uniform sampler2D uHeight;
uniform float uMicroStrength;
uniform float uDetailStrength;
uniform float uDetailAtlas;
uniform float uDetailInset;
uniform int uFamily;
uniform vec3 uLight;
uniform float uSunIntensity;
uniform vec3 uSunColor;
uniform vec3 uEye;
uniform vec3 uAtmosphereTint;
uniform float uAtmosphereDensity;
uniform float uRelief;
uniform float uShadowQuality;
uniform float uTexel;
uniform float uTime;
uniform float uAudio;
uniform vec3 uStormCenter;
// Triplanar detail: no longitude seam or polar singularity. Mirrored repeat
// works on NPOT textures in WebGL 1 without changing sampler wrap modes.
vec2 detailUV(vec2 p){return 1.-abs(mod(p*4.,2.)-1.);}
vec2 atlasUV(vec2 p,vec2 tile){
 vec2 uv=detailUV(p);
 if(uDetailAtlas<.5)return uv;
 return tile*.5+vec2(uDetailInset)+uv*(.5-2.*uDetailInset);
}
vec3 detailRGB(vec3 n,vec2 tile){
 vec3 w=pow(abs(n),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);
 vec3 a=texture2D(uDetail,atlasUV(n.yz,tile)).rgb;
 vec3 b=texture2D(uDetail,atlasUV(n.xz,tile)).rgb;
 vec3 c=texture2D(uDetail,atlasUV(n.xy,tile)).rgb;
 vec3 rgb=a*w.x+b*w.y+c*w.z;
 return rgb;
}
// Height values, not object-space normals. Project finite differences into
// the spherical tangent plane, with a bounded strength at atlas transitions.
float microHeight(vec3 n,vec2 tile){
 vec3 w=pow(abs(n),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);
 return texture2D(uHeight,atlasUV(n.yz,tile)).r*w.x+
 texture2D(uHeight,atlasUV(n.xz,tile)).r*w.y+
 texture2D(uHeight,atlasUV(n.xy,tile)).r*w.z;
}
vec3 microRelief(vec3 n,vec3 base,vec2 tile,float strength){
 vec3 t=normalize(cross(abs(n.y)>.95?vec3(1.,0.,0.):vec3(0.,1.,0.),n)),b=cross(n,t);
 float e=.004;
 float h=microHeight(n,tile);
 float x=microHeight(normalize(n+t*e),tile)-h;
 float y=microHeight(normalize(n+b*e),tile)-h;
 return normalize(base-clamp(strength,0.,1.)*(t*clamp(x*3.,-.22,.22)+b*clamp(y*3.,-.22,.22)));
}
void main(){
 vec3 n=normalize(vDirection),l=normalize(uLight),v=normalize(uEye-n);
 vec4 terrain=textureCube(uTerrain,n),climate=textureCube(uClimate,n);
 // Gas bands move at different angular speeds according to latitude.
 if(uFamily==5){
  float drift=.018+.028*sin(n.y*12.);
  climate.b=textureCube(uClimate,rotateAtmosphere(n,uTime*drift)).b;
  if(uShadowQuality>.5)climate.b=mix(climate.b,.93,worldStorm(n,rotateAtmosphere(uStormCenter,uTime*.009),uTime,.32)*.48);
 }
 WorldMaterial m=worldMaterial(uFamily,terrain,climate);
 vec2 microTile=vec2(0.);float microConfidence=1.;
 if(uFamily!=5 && uDetailStrength>0.){
 float mask=(uFamily==0||uFamily==1)?(1.-terrain.g)*(1.-terrain.b):1.;
 // Preserve the procedural climate colors, oceans and emission.
 vec3 detail=vec3(.5);
 if(uFamily==0 && uDetailAtlas>.5){
  // Continuous local weights derived from the existing natural climate maps.
  float polar=1.-smoothstep(.20,.43,climate.r);
  float alpine=smoothstep(.62,.88,terrain.r)*(1.-polar);
  float desert=(1.-smoothstep(.18,.48,climate.g))*smoothstep(.40,.67,climate.r)*(1.-polar)*(1.-alpine);
  vec4 w=vec4(max(0.,1.-polar-alpine-desert),desert,alpine,polar);
  w/=max(dot(w,vec4(1.)),.0001);
  float best=w.x;
  if(w.y>best){best=w.y;microTile=vec2(1.,0.);}
  if(w.z>best){best=w.z;microTile=vec2(0.,1.);}
  if(w.w>best){best=w.w;microTile=vec2(1.,1.);}
  microConfidence=smoothstep(.52,.78,best);
  detail=detailRGB(n,vec2(0.,0.))*w.x+detailRGB(n,vec2(1.,0.))*w.y+detailRGB(n,vec2(0.,1.))*w.z+detailRGB(n,vec2(1.,1.))*w.w;
 }else detail=detailRGB(n,vec2(0.));
 vec3 photo=pow(max(detail,vec3(.001)),vec3(2.2));
 m.color*=mix(vec3(1.),clamp(photo*2.4,vec3(.35),vec3(1.65)),clamp(uDetailStrength*mask,0.,1.));
 }
 // Earth-only channels: climate.a = river, terrain.a = city site.
 if(uFamily==0){
 m.color=mix(m.color,vec3(.018,.075,.095),climate.a*(1.-terrain.g)*.24);
 m.emission+=vec3(1.,.56,.19)*pow(terrain.a,3.)*.22*(1.-terrain.g)*(1.-smoothstep(-.15,.15,dot(n,l)));
 }
 vec3 normal=n;
 if(uFamily!=5)normal=worldReliefNormal(uTerrain,n,uRelief*(1.-terrain.g),uTexel);
 if(uFamily!=5&&uMicroStrength>0.){float land=(uFamily==0||uFamily==1)?(1.-terrain.g)*(1.-terrain.b):1.;normal=microRelief(n,normal,microTile,uMicroStrength*land*microConfidence);}
 if(uFamily==0||uFamily==1){
  float openWater=terrain.g*(1.-terrain.b);
  normal=normalize(mix(normal,worldOceanNormal(n,uTime,uAudio),openWater));
  m.roughness=mix(m.roughness,.12+.07*clamp(uAudio,0.,1.),openWater);
 }
 if(uFamily==3){
  // Existing lava mask is stable; slow thermal pulses affect light only.
  float pulse=.86+.14*sin(uTime*.7+dot(n,vec3(12.,19.,7.)));
  m.emission*=pulse;
 }
 m.emission*=1.+.15*clamp(uAudio,0.,1.);
 float visibility=1.;
 if(uFamily!=5 && uShadowQuality>0.){
  float land=(uFamily==0||uFamily==1)?1.-terrain.g:1.;
  float shadow=uShadowQuality>.5?worldTerrainShadow(uTerrain,n,l,terrain.r,uRelief,uTexel):worldTerrainShadowLite(uTerrain,n,l,terrain.r,uRelief,uTexel);
  visibility=mix(1.,shadow,land);
 }
 vec3 color=shadeWorld(m,normal,l,v,visibility,clamp(uSunColor,vec3(0.),vec3(2.))*uSunIntensity, dot(n,l));
 if(uFamily==0||uFamily==1){
 float a=uTime*(.015+.008*cos(n.y*6.));
 vec3 q=rotateAtmosphere(n,a);
 float cloud=smoothstep(.48,.82,textureCube(uClimate,q).b);
 if(uShadowQuality>.5){
  vec3 center=rotateAtmosphere(uStormCenter,uTime*.009);
  vec4 localTerrain=textureCube(uTerrain,center),localClimate=textureCube(uClimate,center);
  float stormActivity=smoothstep(.65,.95,localTerrain.g)*smoothstep(.45,.7,localClimate.r)*(1.-localTerrain.b);
  cloud=max(cloud,worldStorm(n,center,uTime,.24)*stormActivity*.88);
 }
 color*=worldCloudShadow(uClimate,q,l,.7);
 color=mix(color,vec3(.85)*(.08+.92*max(dot(n,l),0.)),cloud*.55);
 }
 color+=worldAtmosphere(n,v,l,uAtmosphereTint,uAtmosphereDensity);
 color=color/(1.+color);
 gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(1./2.2)),1.);
}
