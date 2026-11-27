// GLSL ES helper fragment. Insert before lot97/terraH; no new uniforms required.
float pdeEase(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
float pdeHash(vec2 p,float seed){return fract(sin(dot(p,vec2(127.1,311.7))+seed)*43758.5453);}
float pdeVariant(vec2 lot,float seed){return floor(pdeHash(lot,seed)*16.);}
float pdeGrow(vec2 lot,float seed,float progress){return pdeEase((pdeEase(progress)-pdeHash(lot,seed))*8.+.5);}
float pdeHeight(float progress,float variant){return .12+pdeEase((progress-.18)/.82)*(.25+1.6*variant/15.);}
// Multipliers preserve original bounds when progress reaches 1.
float pdeRelief(float progress){return .15+.85*pdeEase(progress);}
float pdeRidge(float progress){return pdeEase((progress-.25)/.75);}
vec3 pdeFacade(vec3 base,float variant){float f=floor(variant/4.);return base*mix(vec3(.85,.91,1.),vec3(1.12,1.04,.88),f/3.);}
