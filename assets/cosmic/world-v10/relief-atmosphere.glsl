// GLSL ES 1.00. Use the same coordinate frame for cube maps and lighting.
vec3 worldReliefNormal(samplerCube terrainMap,vec3 direction,float strength,float epsilon){
 vec3 n=normalize(direction);
 vec3 axis=abs(n.y)>.95?vec3(1.,0.,0.):vec3(0.,1.,0.);
 vec3 t=normalize(cross(axis,n)),b=cross(n,t);
 float e=max(epsilon,.001);
 float dx=textureCube(terrainMap,normalize(n+t*e)).r-textureCube(terrainMap,normalize(n-t*e)).r;
 float dy=textureCube(terrainMap,normalize(n+b*e)).r-textureCube(terrainMap,normalize(n-b*e)).r;
 return normalize(n-strength*(dx*t+dy*b)/(2.*e));
}
vec3 worldAtmosphere(vec3 N,vec3 V,vec3 L,vec3 tint,float density){
 float rim=pow(1.-clamp(dot(N,V),0.,1.),3.);
 float day=smoothstep(-.25,.55,dot(N,L));
 return tint*rim*clamp(density,0.,1.)*(.025+.975*day);
}
float worldCloudShadow(samplerCube climateMap,vec3 direction,vec3 light,float density){
 float cloud=textureCube(climateMap,normalize(direction+light*.025)).b;
 return 1.-smoothstep(.45,.85,cloud)*clamp(density,0.,1.)*.35;
}
// Gas giants should bypass relief. Atmosphere is a surface rim approximation,
// not volumetric scattering; use cloud shadows only for appropriate families.

// Short horizon probe on the sphere, only for the high quality tiers.
// A bounded approximation of directional terrain occlusion, not a shadow map.
float worldTerrainShadow(samplerCube terrainMap,vec3 n,vec3 l,float height,float scale,float epsilon){
 float nl=dot(n,l);
 if(nl<=0.||scale<=0.)return 1.;
 vec3 tangent=l-n*nl;
 float len=length(tangent);
 if(len<.001)return 1.;
 tangent/=len;
 float e=max(epsilon,.002);
 float occlusion=0.;
 for(int i=1;i<=3;i++){
  float d=e*float(i)*1.6;
  vec3 q=normalize(n+tangent*d);
  float rise=(textureCube(terrainMap,q).r-height)*scale;
  // Curvature lowers the local horizon with distance.
  float clearance=d*nl/max(len,.001)+.5*d*d;
  occlusion=max(occlusion,smoothstep(.002,.014,rise-clearance));
 }
 return 1.-.72*occlusion;
}
