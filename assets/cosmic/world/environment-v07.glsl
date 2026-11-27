// Pure GLSL ES helpers; caller supplies native terrain samples in local tangent coordinates.
float pd07blend(float field,float threshold,float width){return smoothstep(threshold-max(width,.0001),threshold+max(width,.0001),field);}
vec2 pd07downhill(float hL,float hR,float hD,float hU,float spacing){return -vec2(hR-hL,hU-hD)/max(2.*spacing,.00001);}
float pd07channel(float slope,float valley,float wet,float source){return clamp(source*wet*mix(.25,1.,valley)*smoothstep(.001,.12,slope),0.,1.);}
float pd07snow(float temp,float slope,float moisture){return (1.-smoothstep(.22,.38,temp))*(1.-smoothstep(.45,.95,slope))*moisture;}
float pd07rain(float moisture,float uplift,float cold){return clamp(moisture*(.35+.65*uplift)*(1.-cold),0.,1.);}
float pd07opacity(float density,float distanceTravelled){return 1.-exp(-max(density,0.)*max(distanceTravelled,0.));}
float pd07pulse(float age,float duration){float t=clamp(age/max(duration,.001),0.,1.);return smoothstep(0.,.12,t)*(1.-smoothstep(.55,1.,t));}
vec3 pd07material(vec3 base,vec3 deposit,float mask){return mix(base,deposit,clamp(mask,0.,1.));}
