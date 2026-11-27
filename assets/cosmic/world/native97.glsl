// Insert before lot97. No new uniforms, loops or texture reads.
float pd04Variant(float lh,float salt){return fract(lh*salt+.173);}
// Only shrink inside existing box; preserve lot ownership and shadow bounds.
vec4 pd04Box(vec4 bx,float lh){vec2 d=(bx.zw-bx.xy)*.12*vec2(pd04Variant(lh,17.31),pd04Variant(lh,23.71));return vec4(bx.xy+d,bx.zw-d);}
float pd04Height(float h,float cap,float lh){return min(cap,max(0.,h*(.82+.18*pd04Variant(lh,31.73))));}
vec3 pd04Material(vec3 base,float lh,float salt){float v=pd04Variant(lh,salt);return clamp(base*(.86+.24*v),0.,1.);}
// Continuous bounded relief modulation; use same value for fast and detailed paths.
float pd04Relief(float seed){return .9+.2*fract(seed*.173);}
