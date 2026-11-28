vec3 pdBlackbodyLava(float heat){
  float t=clamp(heat,0.,1.);
  return vec3(smoothstep(.08,.82,t),.52*smoothstep(.40,.98,t),.13*smoothstep(.72,1.,t))*t;
}
vec3 pdDecodeBlenderNormal(vec2 encoded,float strength,float flipY){
  vec2 xy=(encoded*2.-1.)*strength*vec2(1.,flipY);
  return normalize(vec3(xy,sqrt(max(.001,1.-dot(xy,xy)))));
}
vec3 pdComputeVolcanicEmissive(float glow,vec3 ao,vec2 uv,vec3 env,float tier){
  float lava=pdMask(PD_LAVA,uv,vec3(.5)).r;
  float vent=pdMask(PD_VENT,uv,vec3(.5)).r;
  float heat=clamp(glow*(.74+.32*lava)+glow*(ao.g+.35*ao.b)*.24,0.,1.);
  float spark=tier>=2.?smoothstep(.78,.98,vent)*glow*env.z*.22:0.;
  return pdBlackbodyLava(heat)*1.9*(1.+.22*env.x)+vec3(1.,.49,.13)*spark;
}
vec3 pdVolcanicAshUnderglow(float cloud,float heat,float sun){
  return vec3(.36,.085,.018)*cloud*heat*(1.-smoothstep(-.18,.26,sun));
}
