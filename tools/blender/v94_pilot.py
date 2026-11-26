"""Blender V9.4 pilot. Run: blender -b -t 2 --python tools/blender/v94_pilot.py"""
import bpy, math, os
from mathutils import Vector
from pathlib import Path
ROOT=Path("assets/3d")
def mesh(name, verts, faces, masks, uv):
    m=bpy.data.meshes.new(name); m.from_pydata(verts,[],faces); m.update()
    o=bpy.data.objects.new(name,m); bpy.context.collection.objects.link(o)
    c=m.color_attributes.new(name="COLOR_0",type="FLOAT_COLOR",domain="POINT")
    for i,v in enumerate(masks): c.data[i].color=v
    layer=m.uv_layers.new(name="UVMap")
    for p in m.polygons:
        p.use_smooth=True
        for j in p.loop_indices: layer.data[j].uv=uv[m.loops[j].vertex_index]
    return o
def terrain(kind,lod):
    n,rings=(64,28) if lod==0 else (32,14)
    v=[]; f=[]; c=[]; uv=[]
    for j in range(rings+2):
        r=min(j/rings,1)
        for i in range(n):
            a=2*math.pi*i/n; x=r*math.cos(a); y=r*math.sin(a)
            fade=max(0,1-r**4)
            if kind=="volcano":
                z=(.38*(1-r)**1.25-.16*math.exp(-(r/.13)**4)+.025*math.sin(11*a+5*r)*r*(1-r))*fade
                lava=max(0,math.cos(7*a+3*r)-.91)*10*min(1,r/.2)*fade
                smoke=math.exp(-(r/.15)**4)
            else:
                z=.32*math.exp(-((y-.12*math.sin(5*x))/.24)**2)*(1-r*r)**2*(.8+.2*math.cos(15*x))+ .025*math.sin(19*x+7*y)*fade
                lava=smoke=0
            if j==rings+1: z=-.05
            v.append((x,y,z)); c.append((min(1,lava),smoke,fade*.3,fade)); uv.append((i/n,r))
    for j in range(rings+1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n; f.append((a,b,b+n,a+n))
    return mesh(f"{kind}_LOD{lod}",v,f,c,uv)
def building(k,lod):
    w=.08+.012*(k%3); d=.09+.015*(k%2); h=.16+.045*k
    levels=[(-.05,w,d),(0,w,d),(h*.82,w,d),(h*.82,w*.75,d*.75),(h,w*.75,d*.75)] if lod==0 else [(-.05,w,d),(h,w,d)]
    v=[]; c=[]; uv=[]; f=[]
    for z,x,y in levels:
        for i,(a,b) in enumerate([(-x,-y),(x,-y),(x,y),(-x,y)]):
            v.append((a,b,z)); c.append((.8 if z>0 else 0,0,0,1)); uv.append((i/4,max(0,z/h)))
    for j in range(len(levels)-1):
        for i in range(4):
            a=j*4+i;b=j*4+(i+1)%4;f.append((a,b,b+4,a+4))
    f.append(tuple(range(len(v)-4,len(v))))
    o=mesh(f"building{k}_LOD{lod}",v,f,c,uv)
    for p in o.data.polygons:p.use_smooth=False
    return o
def export(name,objects):
    dest=ROOT/name;dest.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
        o.data.calc_loop_triangles()
        assert len(o.data.loop_triangles)<= (4000 if o.name.endswith("LOD0") else 1000)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(dest/(name+".glb")),export_format="GLB",use_selection=True,export_yup=True,export_animations=False)
    for o in objects:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
for kind in ("volcano","mountain"):export(kind,[terrain(kind,i) for i in (0,1)])
for k in range(6):export("building"+str(k),[building(k,i) for i in (0,1)])
