// Concatenate after precision declaration, materials.glsl and relief-atmosphere.glsl.
varying vec3 vDirection;
uniform samplerCube uTerrain;
uniform samplerCube uClimate;
uniform sampler2D uDetail;
uniform float uDetailStrength;
uniform int uFamily;
uniform vec3 uLight;
uniform vec3 uEye;
uniform vec3 uAtmosphereTint;
uniform float uAtmosphereDensity;
uniform float uRelief;
uniform float uTexel;
uniform float uTime;
uniform float uAudio;
// Triplanar detail: no longitude seam or polar singularity. Mirrored repeat
// works on NPOT textures in WebGL 1 without changing sampler wrap modes.
vec2 detailUV(vec2 p){return 1.-abs(mod(p*4.,2.)-1.);}
float detailLuma(vec3 n){
 vec3 w=pow(abs(n),vec3(4.));w/=max(dot(w,vec3(1.)),.0001);
 vec3 a=texture2D(uDetail,detailUV(n.yz)).rgb;
 vec3 b=texture2D(uDetail,detailUV(n.xz)).rgb;
 vec3 c=texture2D(uDetail,detailUV(n.xy)).rgb;
 vec3 rgb=a*w.x+b*w.y+c*w.z;
 return dot(rgb,vec3(.2126,.7152,.0722));
}
void main(){
 vec3 n=normalize(vDirection),l=normalize(uLight),v=normalize(uEye-n);
 vec4 terrain=textureCube(uTerrain,n),climate=textureCube(uClimate,n);
 WorldMaterial m=worldMaterial(uFamily,terrain,climate);
 if(uFamily!=5 && uDetailStrength>0.){
 float mask=(uFamily==0||uFamily==1)?(1.-terrain.g)*(1.-terrain.b):1.;
 // Preserve the procedural climate colors, oceans and emission.
 m.color*=mix(1.,mix(.65,1.35,detailLuma(n)),clamp(uDetailStrength*mask,0.,1.));
 }
 vec3 normal=n;
 if(uFamily!=5)normal=worldReliefNormal(uTerrain,n,uRelief*(1.-terrain.g),uTexel);
 m.emission*=1.+.15*clamp(uAudio,0.,1.);
 vec3 color=shadeWorld(m,normal,l,v);
 if(uFamily==0||uFamily==1){
 float a=uTime*.015;
 vec3 q=vec3(cos(a)*n.x+sin(a)*n.z,n.y,-sin(a)*n.x+cos(a)*n.z);
 float cloud=smoothstep(.48,.82,textureCube(uClimate,q).b);
 color*=worldCloudShadow(uClimate,q,l,.7);
 color=mix(color,vec3(.85)*(.08+.92*max(dot(n,l),0.)),cloud*.55);
 }
 color+=worldAtmosphere(n,v,l,uAtmosphereTint,uAtmosphereDensity);
 color=color/(1.+color);
 gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(1./2.2)),1.);
}
