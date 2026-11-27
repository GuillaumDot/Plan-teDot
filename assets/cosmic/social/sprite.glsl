// Helpers only. Atlas UV assumes top-left origin; adapt to native upload convention.
vec2 pdReactionUV(vec2 uv, float frame) {
 vec2 cell=vec2(mod(frame,4.0),floor(frame/4.0));
 return (cell+(uv*190.0+1.0)/192.0)/4.0;
}
// Input RGB must be linear, straight alpha. Convert sRGB once in native pipeline.
vec4 pdReactionLight(vec4 texel,vec3 ambient,vec3 sun,float visibility,float fade){
 vec3 light=clamp(ambient+sun*clamp(visibility,0.0,1.0),vec3(0.12),vec3(1.5));
 return vec4(texel.rgb*light,texel.a*clamp(fade,0.0,1.0));
}
