"""Optional conservative patch. Refuses unexpected source; never edits input."""
import sys,pathlib
src,dst=map(pathlib.Path,sys.argv[1:3]); assert src.resolve()!=dst.resolve(); s=src.read_text(); helper=pathlib.Path(__file__).with_name('native97.glsl').read_text()
def once(a,b):
 global s
 if s.count(a)!=1: raise ValueError('Anchor missing or ambiguous: '+a[:100])
 s=s.replace(a,b,1)
once('float lot97(vec2 c,vec2 B,vec4 I,out vec4 bx,out float lh){',helper+'\nfloat lot97(vec2 c,vec2 B,vec4 I,out vec4 bx,out float lh){')
once('bx=vec4(o+ins,o+LS-ins); return min(h,I.w);','bx=pd04Box(vec4(o+ins,o+LS-ins),lh); return pd04Height(h,I.w,lh);')
# Apply material variation consistently to all existing return paths via wrappers.
for name,salt in [('roof97','19.31'),('wall97','29.71')]:
 anchor=f'vec3 {name}(float ty,float lh){{'; once(anchor,anchor.replace(name,name+'_base04'))
 start=s.index(anchor.replace(name,name+'_base04')); end=s.index('}',start)+1
 s=s[:end]+f'\nvec3 {name}(float ty,float lh){{return pd04Material({name}_base04(ty,lh),lh,{salt});}}\n'+s[end:]
dst.write_text(s)
