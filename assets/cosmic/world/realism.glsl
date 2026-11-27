// Optional helpers, no uniforms or texture fetches. Insert before lot97.
float pd05rand(float x,float salt){return fract(sin(x*127.1+salt*311.7)*43758.5453);}
vec3 pd05finish(vec3 base,float id,float salt){float v=pd05rand(id,salt);return clamp(base*(.88+.24*v),0.,1.);}
// Material microstructure: fade before subpixel aliasing; call only in close view.
vec3 pd05micro(vec3 base,vec2 q,float tp,float id,float kind){
 float fade=smoothstep(8.,24.,tp); float grain=pd05rand(dot(floor(q*8.),vec2(17.,59.))+id,3.);
 float seam=1.-smoothstep(.02,.10,abs(fract(q.y*4.)-.5));
 return clamp(base*(1.+fade*((grain-.5)*.12-seam*.08*kind)),0.,1.);
}
float pd05wet(float moisture,float slope,float rain){return clamp(moisture*rain*(1.-clamp(slope,0.,1.)),0.,1.);}
vec3 pd05wetColor(vec3 base,float wet){return base*mix(1.,.72,clamp(wet,0.,1.));}
float pd05fresnel(float ndv,float f0){return f0+(1.-f0)*pow(1.-clamp(ndv,0.,1.),5.);}
float pd05snow(float altitude,float temperature,float slope){return smoothstep(.1,.35,altitude-temperature*.35)*(1.-smoothstep(.45,.85,slope));}
float pd05erosion(float ridge,float valley,float strength){return clamp(strength,0.,1.)*(ridge*.025-valley*.035);}
float pd05pulse(float beat,float bass,float t){return clamp(beat*.65+bass*.35,0.,1.)*(.5+.5*sin(t));}
