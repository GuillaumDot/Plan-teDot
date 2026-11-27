import json,pathlib,numpy as np
from PIL import Image
P=pathlib.Path(__file__).parent; T=P/'textures'; T.mkdir(exist_ok=True)
materials={'basalt':(.23,.21,.20,.85),'granite':(.48,.45,.42,.8),'sand':(.73,.56,.34,.9),'snow':(.87,.91,.95,.65),'grass':(.27,.40,.15,.9),'brick':(.58,.28,.19,.75),'concrete':(.55,.54,.51,.8),'slate':(.30,.34,.39,.7),'asphalt':(.22,.23,.24,.9),'metal':(.48,.53,.57,.3),'lava':(.65,.15,.035,.55),'ice':(.55,.76,.86,.25)}
N=128; y,x=np.mgrid[0:N,0:N]; u=x/N; v=y/N
for i,(name,(r,g,b,rough)) in enumerate(materials.items()):
 rng=np.random.default_rng(501+i); h=np.zeros((N,N))
 for f in (2,4,8,16,32):
  for _ in range(4):
   a,c=rng.integers(-f,f+1,2); h+=np.sin(2*np.pi*(a*u+c*v)+rng.uniform(0,6.28))/(f**.55)
 h=(h-h.min())/(h.max()-h.min());
 if name=='brick': h*=.5+.5*((np.mod(v*8,1)>.08)&(np.mod(u*4+np.floor(v*8)*.5,1)>.06))
 if name=='slate': h*=.65+.35*(np.mod(v*8,1)>.1)
 dx=(np.roll(h,-1,1)-np.roll(h,1,1))*2; dy=(np.roll(h,-1,0)-np.roll(h,1,0))*2; normal=np.stack([-dx,-dy,np.ones_like(h)],-1); normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
 maps={'albedo':np.array([r,g,b])[None,None,:]*(.72+.48*h[:,:,None]),'normal':normal*.5+.5,'roughness':np.clip(rough+(h-.5)*.18,0,1),'height':h}
 for k,a in maps.items(): Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(T/f'{name}_{k}.png')
json.dump({'size':N,'colorSpace':{'albedo':'sRGB','normal':'linear','roughness':'linear','height':'linear'},'materials':list(materials),'normalConvention':'OpenGL +Y','usage':'optional reference tiles; not wired to native texture bins'},open(T/'manifest.json','w'),indent=2)
