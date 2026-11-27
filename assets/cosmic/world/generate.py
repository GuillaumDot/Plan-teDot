# Blender 4.x: blender -b -P generate.py -- --out assets --biome earth --family housing
import bpy, math, random, sys, argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from catalog import *
p=argparse.ArgumentParser(); p.add_argument('--out',default='assets'); p.add_argument('--biome',choices=PALETTES); p.add_argument('--family',choices=FAMILIES); p.add_argument('--limit',type=int,default=0); a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
def mat(n,c):
 m=bpy.data.materials.get(n) or bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1);return m
def obj(k,x,y,z,w,d,h,m):
 if k=='box': bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));scale=(w,d,h)
 elif k=='cone': bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=1,depth=2,location=(x,y,z));scale=(w/2,d/2,h/2)
 elif k=='cyl': bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=1,depth=2,location=(x,y,z));scale=(w/2,d/2,h/2)
 else: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,location=(x,y,z));scale=(w/2,d/2,h/2)
 o=bpy.context.object;o.scale=scale;o.data.materials.append(m);return o
def building(x,y,w,d,h,floors,v):
 obj('box',x,y,h/2,w,d,h,B)
 if floors<3: obj('cone' if v%2 else 'box',x,y,h+.07,w*1.12,d*1.12,.14,A)
 else:
  obj('box',x,y,h+.04,w*.7,d*.7,.08,A)
  if v%3==0: obj('cyl',x,y,h+.14,.025,.025,.2,G)
 for i in range(floors):
  z=h*(i+.55)/floors
  for j in range(2+v%2):
   u=(j-(1+v%2)/2)*w/(3+v%2)
   for side in (-1,1): obj('box',x+u,y+side*(d/2+.004),z,w*.17,.012,h/floors*.36,G)
 obj('box',x,y-d/2-.009,.065,w*.22,.018,.13,A)
def terrain(x,y,w,d,h,crater=False):
 verts=[];faces=[];N=24;R=5
 for j in range(R+1):
  t=j/R
  for i in range(N):
   ang=2*math.pi*i/N;rad=t*(1+.12*math.sin(ang*3+v)+.08*math.cos(ang*7)); z=h*(1-t)**.8
   if crater: z=h*(.35+.65*math.exp(-((t-.36)/.18)**2))*(1-t)
   z=max(0,z*(1+.14*math.sin(ang*5+t*4))) if j<R else 0
   verts.append((x+w*rad*math.cos(ang)/2,y+d*rad*math.sin(ang)/2,z))
 for j in range(R):
  for i in range(N): faces.append((j*N+i,(j+1)*N+i,(j+1)*N+(i+1)%N,j*N+(i+1)%N))
 mesh=bpy.data.meshes.new('terrain');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('terrain',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(B);o.data.materials.append(A)
 for poly in mesh.polygons:
  if poly.center.z>h*.65 and f in ('mountain','ice'):poly.material_index=1
count=0
for e in entries():
 b,f,s,v=e['biome'],e['family'],e['stage'],e['variant']
 if a.biome and b!=a.biome or a.family and f!=a.family:continue
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for mesh in list(bpy.data.meshes):
  if mesh.users==0:bpy.data.meshes.remove(mesh)
 r=random.Random(v+100*list(FAMILIES).index(f));c,ac=PALETTES[b];B=mat(b+'_base',c);A=mat(b+'_accent',ac);G=mat('glass',(.10,.23,.32));t=s/len(FAMILIES[f]);w=.28+.32*t
 if f in ('housing','commerce','civic','industry'):
  n=1 if f=='housing' else min(s,4)
  for i in range(n):
   x=(i-(n-1)/2)*.48;h=.12+t*t*(1.9 if f=='housing' else .65);floors=max(1,round(h/.14));building(x,0,w*(1+v*.035),w*(.8+v%3*.13),h,floors,v)
   if f=='industry':obj('cyl',x+.12,.15,h+.12,.07,.07,h+.24,A)
  if b=='water':obj('box',0,0,-.025,max(.7,n*.55),.8,.05,A)
 elif f in ('mountain','volcano','dune','island','ice'):
  for i in range(1+max(0,s-3)):
   terrain((i-max(0,s-3)/2)*.28,r.uniform(-.12,.12),.45+.4*t,.55+.2*t,(.08+.65*t)*r.uniform(.8,1.2),f=='volcano')
 elif f in ('forest','reef','agriculture'):
  for i in range(s*3):
   x,y=r.uniform(-.48,.48),r.uniform(-.48,.48);h=(.07+.24*t)*r.uniform(.7,1.2)
   if f=='agriculture':x=(i%6-2.5)*.14;y=(i//6-1)*.15
   obj('cyl',x,y,h*.3,.025,.025,h*.6,B);obj('cone' if v%2 else 'ico',x,y,h*.75,h*.7,h*.7,h*.7,A)
 elif f in ('water','weather'):
  for i in range(s):
   x,y=r.uniform(-.3,.3),r.uniform(-.3,.3);obj('ico',x,y,.015 if f=='water' else .18+r.random()*.1,.3+.5*t,.25+.4*t,.035 if f=='water' else .15,A)
 elif f=='road':
  for i in range(s):obj('box',0,(i-(s-1)/2)*.12,.012,1,.09,.024,B);obj('box',0,(i-(s-1)/2)*.12,.026,.8,.008,.004,A)
 elif f=='port':
  for i in range(s):obj('box',(i-(s-1)/2)*.15,0,.035,.10,.7,.07,B);obj('box',(i-(s-1)/2)*.15,.22,.10,.08,.15,.06,A)
 elif f=='energy':
  for i in range(s):
   x=(i-(s-1)/2)*.2;obj('cyl',x,0,.12,.035,.035,.24,B);o=obj('box',x,0,.25,.18,.13,.025,A);o.rotation_euler.y=.35
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.ops.export_scene.gltf(filepath=str(out/e['url']),export_format='GLB');count+=1
 if a.limit and count>=a.limit:break
print('Exported',count)
