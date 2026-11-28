float pdComputeSafeRoughness(vec3 n,float roughness){
  vec3 dx=dFdx(n),dy=dFdy(n);
  return clamp(sqrt(roughness*roughness+min(.18,dot(dx,dx)+dot(dy,dy))),.06,1.);
}
vec2 pdSampleCloudsAndShadow(vec3 n,vec3 light,float phase,float mid,float tier,float drift){
  vec3 q=rotateAtmosphere(n,phase*.009);
  vec2 uv=pdSphereUV(q);
  float cloud=pdMask(PD_CLOUD,uv,vec3(.5)).r;
  float shadow=0.;
  if(tier>=1.){
    vec3 tangent=light-n*dot(light,n);
    vec2 projected=pdSphereUV(normalize(q+.045*tangent));
    shadow=pdMask(PD_CLOUD,projected,vec3(.5)).r*smoothstep(-.04,.20,dot(n,light));
  }
  return vec2(cloud,shadow)*(.84+min(.35,mid*drift));
}
vec3 pdComputeAtmosphereScatter(vec3 n,vec3 v,vec3 l,vec3 tint,float density,float high){
  float mu=max(dot(n,v),0.),sun=dot(n,l);
  float rim=pow(1.-mu,3.5)*smoothstep(-.27,.34,sun);
  float sunset=exp(-abs(sun+.035)*20.)*(.28+.72*(1.-mu));
  return density*(tint*rim*.19*(1.+.16*high)+vec3(.55,.19,.06)*sunset*.11);
}
