// Optional pure helpers. q = unit sphere direction; density masks sampled by caller.
float pd06gas(vec3 q,float warp,float bands,float phase){return .5+.5*sin(q.y*bands+warp+phase);}
float pd06spectral(float field,float width){return exp(-abs(field)/max(width,.01));}
float pd06opacity(float density,float thickness){return 1.-exp(-max(density,0.)*max(thickness,0.));}
float pd06dustPhase(float mu,float g){g=clamp(g,-.8,.8);return (1.-g*g)/pow(max(1.+g*g-2.*g*clamp(mu,-1.,1.),.04),1.5);}
vec3 pd06cloud(vec3 dark,vec3 light,float density,float sun){return mix(dark,light,clamp(sun*(1.-.55*density),0.,1.));}
