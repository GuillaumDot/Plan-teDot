"""Blender 4.x: blender -b -P planetedot_assets.py -- ./assets"""
import bpy, math, random, sys, json
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else './assets'); out.mkdir(parents=True,exist_ok=True)
manifest=[]
palettes={'earth':[(.45,.35,.24),(.22,.38,.16)],'water':[(.45,.65,.7),(.08,.45,.5)],'desert':[(.7,.45,.22),(.6,.3,.12)],'volcanic':[(.22,.2,.19),(.6,.12,.03)],'ice':[(.65,.8,.9),(.3,.5,.7)],'future':[(.35,.42,.5),(.1,.65,.8)]}
def mat(name,c):
 m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True; m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1); return m
def shape(kind,loc,scale,m):
 if kind=='cube': bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 elif kind=='cone': bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=1,radius2=0,depth=2,location=loc)
 else: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=loc)
 o=bpy.context.object; o.scale=scale; o.data.materials.append(m); return o
for biome,(c,a) in palettes.items():
 for family,stages in {'housing':5,'mountain':4,'forest':4,'industry':3,'island':4,'dune':4,'volcano':4}.items():
  for stage in range(1,stages+1):
   for variant in range(3):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    r=random.Random(stage*100+variant); base=mat('base',c); accent=mat('accent',a); glass=mat('glass',(.12,.25,.35)); n=stage if family!='housing' else 1
    if family=='housing':
     h=[.22,.36,.55,1.05,1.8][stage-1]; w=.45+variant*.07
     shape('cube',(0,0,h/2),(w,w,h),base)
     if stage<=3: shape('cone',(0,0,h+.12),(w*.75,w*.75,.14),accent)
     else: shape('cube',(0,0,h+.05),(w*.65,w*.65,.1),accent)
     for floor in range(stage):
      z=h*(floor+.5)/stage
      for x in [-w*.23,w*.23]: shape('cube',(x,-w/2-.006,z),(w*.22,.015,h/stage*.35),glass)
    elif family=='industry':
     for i in range(n):
      x=(i-(n-1)/2)*.5; shape('cube',(x,0,.2),(.46,.65,.4),base); shape('cube',(x,.18,.48),(.09,.09,.56),accent)
    elif family=='forest':
     for i in range(stage*3):
      x,y=r.uniform(-.45,.45),r.uniform(-.45,.45); h=r.uniform(.18,.4); shape('cube',(x,y,h*.25),(.04,.04,h*.5),base); shape('cone',(x,y,h*.7),(.12,.12,h*.55),accent)
    else:
     for i in range(n):
      x=(i-(n-1)/2)*.32; h=(.15+stage*.12)*r.uniform(.7,1.2); kind='cone' if family in ('mountain','volcano') else 'ico'; shape(kind,(x,0,h*.45),(.32,.32,h*.55),base)
      if family=='volcano': shape('ico',(x,0,h*.85),(.09,.09,.035),accent)
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    name=f'{biome}_{family}_{stage:02}_{variant:02}'; bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB'); manifest.append(dict(id=name,biome=biome,family=family,stage=stage,variant=variant,url=name+'.glb',pivot='ground',units='relative'))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
