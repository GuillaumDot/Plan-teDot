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
 float rim=pow(1.-clamp(dot(N,V),0.,1.),2.4);
 float day=smoothstep(-.22,.42,dot(N,L));
 return tint*rim*clamp(density,0.,1.)*(.045+1.35*day);
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

// Analytic wave slopes in world space: no UV seams, no persistent displacement.
vec3 worldOceanNormal(vec3 n,float time,float energy){
 vec3 d1=normalize(vec3(.71,.18,.55)),d2=normalize(vec3(-.32,.85,.39)),d3=normalize(vec3(.23,-.48,.86));
 vec3 slope=d1*cos(dot(n,d1)*44.+time*.9)*.032+
            d2*cos(dot(n,d2)*69.-time*1.3)*.021+
            d3*cos(dot(n,d3)*103.+time*1.7)*.011;
 slope-=n*dot(slope,n);
 return normalize(n-slope*(1.+.65*clamp(energy,0.,1.)));
}
vec3 rotateAtmosphere(vec3 n,float angle){
 float c=cos(angle),s=sin(angle);
 return vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);
}

// Analytic spiral weather feature, local tangent plane, no longitude seam.
// This is a visual effect, not a physical weather forecast.
float worldStorm(vec3 n,vec3 center,float time,float radius){
 float facing=dot(n,center);
 if(facing<cos(radius))return 0.;
 vec3 t=normalize(cross(vec3(0.,1.,0.),center)),b=cross(center,t);
 vec2 p=vec2(dot(n,t),dot(n,b));
 float r=length(p)/max(sin(radius),.001);
 float az=atan(p.y,p.x+.00001);
 float arm=.5+.5*cos(3.*az-13.*r-time*.55*sign(center.y));
 float eye=smoothstep(.07,.19,r),edge=1.-smoothstep(.60,1.,r);
 return eye*edge*mix(.25,1.,smoothstep(.20,.85,arm));
}

// One horizon sample at the intermediate quality level; no extra texture.
float worldTerrainShadowLite(samplerCube terrainMap,vec3 n,vec3 l,float height,float scale,float epsilon){
 float nl=dot(n,l); vec3 tangent=l-n*nl; float len=length(tangent);
 if(nl<=0.||scale<=0.||len<.001)return 1.;
 float d=max(epsilon,.002)*1.6;
 float rise=(textureCube(terrainMap,normalize(n+tangent/len*d)).r-height)*scale;
 float clearance=d*nl/max(len,.001)+.5*d*d;
 return 1.-.42*smoothstep(.002,.014,rise-clearance);
}
