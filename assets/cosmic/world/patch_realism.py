import pathlib,sys
src,dst=map(pathlib.Path,sys.argv[1:3]); assert src.resolve()!=dst.resolve(); s=src.read_text()
def once(a,b):
 global s
 if s.count(a)!=1: raise ValueError('Anchor missing or ambiguous: '+a[:100])
 s=s.replace(a,b,1)
anchor='float lot97(vec2 c,vec2 B,vec4 I,out vec4 bx,out float lh){'
once(anchor,pathlib.Path(__file__).with_name('realism.glsl').read_text()+'\n'+anchor)
# Same roof detail in top-down and ray-traced paths; no geometry changes.
for a,b in [('c2=roof97(I0.y,lh)*(.95+.1*fract(lh*31.));','c2=pd05micro(roof97(I0.y,lh)*(.95+.1*fract(lh*31.)),g0,tp,lh,1.);'),('c3=roof97(hI.y,hl)*(.95+.1*fract(hl*31.));','c3=pd05micro(roof97(hI.y,hl)*(.95+.1*fract(hl*31.)),gh,tp,hl,1.);'),('vec3 wc=wall97(hI.y,hl);','vec3 wc=pd05micro(wall97(hI.y,hl),vec2(a,hh),tp,hl,1.);')]: once(a,b)
dst.write_text(s)
