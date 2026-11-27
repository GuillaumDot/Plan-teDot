import numpy as np, trimesh, json
from pathlib import Path
from PIL import Image
P=Path(__file__).parent
biomes={'alpine':((.23,.34,.19),(.42,.43,.39),(.94,.95,.97)), 'desert':((.65,.39,.19),(.46,.25,.13),(.85,.65,.38)), 'volcanic':((.12,.10,.09),(.27,.23,.21),(.48,.19,.08)), 'tropical':((.08,.29,.10),(.27,.35,.17),(.46,.43,.30)), 'polar':((.37,.57,.68),(.64,.76,.81),(.94,.97,.99)), 'alien':((.22,.10,.35),(.38,.22,.49),(.66,.43,.76)), 'island':((.12,.35,.18),(.42,.43,.25),(.83,.77,.55))}
def terrain(x,y,seed,kind):
 r=np.random.default_rng(seed); z=np.zeros_like(x)
 for k in range(7):
  a,b=r.uniform(0,6.28,2); f=2**k; z+=np.sin(x*f*2.8+a)*np.cos(y*f*2.8+b)*.52**k
 ridge=1-np.abs(z); h=z*.22+ridge**3*.18
 if kind=='alpine': h+=ridge**5*.45
 if kind=='volcanic':
  d=np.hypot(x-.15,y+.1); h+=.7*np.exp(-d*d*5)-.3*np.exp(-d*d*65)
 if kind=='island': h-=.35*(x*x+y*y)
 if kind=='desert': h+=.08*np.sin(x*9+y*2+z*3)
 return h
manifest=[]
for i,(kind,palette) in enumerate(biomes.items()):
 for n in (97,49,25):
  t=np.linspace(-1,1,n); x,y=np.meshgrid(t,t); h=terrain(x,y,170+i,kind); v=np.c_[x.ravel(),h.ravel(),y.ravel()]; a=np.arange(n*n).reshape(n,n); f=np.stack([np.stack([a[:-1,:-1],a[1:,:-1],a[:-1,1:]],-1),np.stack([a[:-1,1:],a[1:,:-1],a[1:,1:]],-1)],-2).reshape(-1,3)
  gy,gx=np.gradient(h,t,t); slope=np.hypot(gx,gy); w=np.clip(slope*.8,0,1); snow=np.clip((h-.25)*5,0,1) if kind in ('alpine','polar') else np.clip((.08-h)*3,0,1); p=np.array(palette); c=p[0]*(1-w[...,None])+p[1]*w[...,None]; c=c*(1-snow[...,None])+p[2]*snow[...,None]; c*= (1+.08*np.sin(x*83)*np.cos(y*71))[...,None]; m=trimesh.Trimesh(v,f,vertex_colors=np.c_[np.clip(c.reshape(-1,3)*255,0,255).astype('uint8'),np.full(n*n,255)],process=False); name=f'{kind}_lod{(97,49,25).index(n)}.glb'; m.export(P/name); manifest.append(dict(file=name,triangles=len(f),seed=170+i,biome=kind))
  if n==97:
   Image.fromarray(np.uint8(np.clip(c*255,0,255))).resize((512,512),Image.Resampling.BICUBIC).save(P/f'{kind}_albedo.png')
   normal=np.stack([-gx,np.ones_like(h),-gy],-1); normal/=np.linalg.norm(normal,axis=-1,keepdims=True); Image.fromarray(np.uint8((normal*.5+.5)*255)).save(P/f'{kind}_normal_object.png')
   Image.fromarray(np.uint16((h-h.min())/(h.max()-h.min())*65535)).save(P/f'{kind}_height.png')
(P/'manifest.json').write_text(json.dumps(manifest,indent=2))
