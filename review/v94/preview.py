# preview renders (Cycles CPU) of the pilot GLBs: python preview.py <run dir> <out dir>
import bpy, sys, math, os, glob
from mathutils import Vector
run, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'
    sc.render.resolution_x = sc.render.resolution_y = 420; sc.render.film_transparent = False
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.015, .02, .04, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.5; so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(55), 0, math.radians(35))
    return sc
def mat(kind):
    m = bpy.data.materials.new(kind); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'Color'
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(at.outputs['Color'], sep.inputs[0])
    if kind == 'terrain':
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sp.inputs[0])
        rmp = nt.nodes.new('ShaderNodeValToRGB'); rmp.color_ramp.elements[0].color = (.16, .13, .11, 1); rmp.color_ramp.elements[1].color = (.55, .5, .46, 1)
        mth = nt.nodes.new('ShaderNodeMath'); mth.operation = 'MULTIPLY'; mth.inputs[1].default_value = 3.; nt.links.new(sp.outputs['Z'], mth.inputs[0]); nt.links.new(mth.outputs[0], rmp.inputs[0])
        nt.links.new(rmp.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = .85
        nt.links.new(sep.outputs['Red'], bs.inputs['Emission Strength']); bs.inputs['Emission Color'].default_value = (1, .35, .05, 1)
    else:
        bs.inputs['Base Color'].default_value = (.55, .56, .6, 1); bs.inputs['Roughness'].default_value = .5
    return m
def frame(objs, dist, elev=35, az=40):
    sc = bpy.context.scene; pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    ctr = sum(pts, Vector()) / len(pts)
    cam = bpy.data.cameras.new('cam'); cam.lens = 50; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    e, a = math.radians(elev), math.radians(az); co.location = ctr + Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e))) * dist
    d = ctr - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
def load(p):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=p); return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
for name in ('volcano', 'mountain'):
    for lod in (0, 1):
        sc = reset(); objs = load(f'{run}/assets/3d/{name}/{name}.glb'); keep = [o for o in objs if o.name.endswith(f'LOD{lod}')]
        for o in objs:
            if o not in keep: bpy.data.objects.remove(o, do_unlink=True)
        for o in keep: o.data.materials.clear(); o.data.materials.append(mat('terrain'))
        frame(keep, 3.6); sc.render.filepath = f'{out}/{name}-LOD{lod}.png'; bpy.ops.render.render(write_still=True)
sc = reset(); allb = []
for k in range(6):
    objs = load(f'{run}/assets/3d/building{k}/building{k}.glb')
    for o in objs:
        if o.name.endswith('LOD1'): bpy.data.objects.remove(o, do_unlink=True)
        else: o.location.x += (k % 3 - 1) * .3; o.location.y += (k // 3 - .5) * .3; o.data.materials.clear(); o.data.materials.append(mat('b')); allb.append(o)
bpy.ops.mesh.primitive_plane_add(size=1.2, location=(0, 0, 0)); allb.append(bpy.context.object)
frame(allb, 2.2, elev=30); sc.render.filepath = f'{out}/buildings-LOD0.png'; bpy.ops.render.render(write_still=True)
print('previews ok')
