// GLSL ES 1.00 helpers; linear colors, caller supplies normalized vectors.
// Family IDs are local to V10, not legacy saved planet IDs.
struct WorldMaterial { vec3 color; float roughness; float metal; vec3 emission; };
WorldMaterial worldMaterial(int family, vec4 terrain, vec4 climate) {
 float h=terrain.r, water=terrain.g, ice=terrain.b, metal=terrain.a;
 float heat=climate.r, wet=climate.g, cloud=climate.b, glow=climate.a;
 vec3 rock=mix(vec3(.12,.085,.06),vec3(.42,.34,.24),h);
 WorldMaterial m=WorldMaterial(rock,.85,0.,vec3(0.));
 if(family==0 || family==1){
 vec3 land=mix(vec3(.48,.33,.15),vec3(.035,.19,.055),smoothstep(.25,.75,wet)*smoothstep(.15,.5,heat));
 float alpine=smoothstep(.65,.9,h);
 land=mix(land,rock,alpine);
 float frost=(1.-smoothstep(.18,.42,heat))*smoothstep(.4,.75,h);
 land=mix(land,vec3(.68,.79,.85),frost);
 float arid=(1.-smoothstep(.12,.38,wet))*smoothstep(.4,.7,heat);
 land=mix(land,vec3(.56,.36,.16),arid*(1.-alpine));
 vec3 sea=mix(vec3(.008,.035,.12),vec3(.025,.32,.29),smoothstep(.32,.52,h));
 m.color=mix(land,sea,water);m.roughness=mix(.82,.13,water);
 m.color=mix(m.color,vec3(.76,.87,.94),ice);
 }else if(family==3){
 m.color=mix(vec3(.025,.02,.018),vec3(.19,.11,.075),h);
 m.emission=vec3(1.,.16,.012)*glow*2.;
 }else if(family==4){
 m.color=mix(vec3(.055,.25,.38),vec3(.74,.88,.95),ice);m.roughness=mix(.18,.48,ice);
 }else if(family==5){
 m.color=mix(vec3(.18,.095,.045),vec3(.85,.65,.39),cloud);m.roughness=1.;
 }else if(family==6){
 m.color=mix(vec3(.13,.15,.22),vec3(.55,.58,.68),metal);m.metal=metal;m.roughness=mix(.7,.24,metal);m.emission=vec3(.24,.08,.7)*glow;
 }
 return m;
}
vec3 shadeWorld(WorldMaterial m,vec3 N,vec3 L,vec3 V,float visibility){
 float nl=max(dot(N,L),0.);vec3 halfVector=L+V;vec3 H=halfVector/max(length(halfVector),.0001);
 float nv=max(dot(N,V),0.);vec3 f0=mix(vec3(.04),m.color,m.metal);
 vec3 F=f0+(1.-f0)*pow(1.-max(dot(H,V),0.),5.);
 float spec=pow(max(dot(N,H),0.),mix(96.,4.,m.roughness));
 return m.color*(1.-m.metal)*(.025+nl*visibility*(1.-F))+F*spec*nl*visibility+m.emission;
}
// Prototype direct lighting, not a complete PBR/IBL pipeline.
