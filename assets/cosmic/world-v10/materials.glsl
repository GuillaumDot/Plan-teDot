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
// Energy-conserving Cook-Torrance direct BRDF (GGX, Schlick-Smith).
// All inputs remain in linear space; no extra texture reads or uniforms.
vec3 shadeWorld(WorldMaterial m,vec3 N,vec3 L,vec3 V,float visibility,vec3 sunRadiance,float geometricNL){
 const float PI=3.14159265;
 float nl=max(dot(N,L),0.),nv=max(dot(N,V),.001);
 vec3 halfVector=L+V;
 vec3 H=halfVector/max(length(halfVector),.0001);
 float nh=max(dot(N,H),0.),vh=clamp(dot(V,H),0.,1.);
 float rough=clamp(m.roughness,.13,1.);
 float metal=clamp(m.metal,0.,1.);
 vec3 f0=mix(vec3(.04),clamp(m.color,vec3(0.),vec3(1.)),metal);
 float x=1.-vh,x2=x*x;
 vec3 F=f0+(1.-f0)*x2*x2*x;
 float a=rough*rough,a2=a*a;
 float d=1.-nh*nh+nh*nh*a2;
 float D=a2/(PI*max(d*d,.0000001));
 float k=(rough+1.)*(rough+1.)*.125;
 float Gv=nv/(nv*(1.-k)+k);
 float Gl=nl/max(nl*(1.-k)+k,.001);
 vec3 spec=F*(D*Gv*Gl/max(4.*nv*nl,.001));
 vec3 diffuse=m.color*(1.-metal)*(1.-F)/PI;
 float day=smoothstep(-.08,.12,geometricNL);
 // Preserve existing scene exposure convention (previous diffuse omitted 1/PI).
 vec3 direct=(diffuse+spec)*PI*nl*visibility*day*sunRadiance;
 return m.color*(.025+.035*metal)+direct+m.emission;
}
// Direct PBR only: environment IBL is a separate, future integration.
