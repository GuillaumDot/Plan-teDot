# exports the app's current 3D logo (LOGO3D in index.html) to a reference glTF for the Blender work: python export_logo.py <index.html> <out.glb> <preview.png>
import sys, re, base64, gzip, json, struct, math
import numpy as np, bpy
from mathutils import Vector
src, out, prev = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(src, encoding='utf-8').read()
raw = gzip.decompress(base64.b64decode(re.search(r'const LOGO3D = "([^"]+)"', s).group(1)))
N = json.loads(re.search(r'const LOGO3D_N = (\{[^}]+\})', s).group(1)); nv0, ni0, zs, nf, nfi = N['nv'], N['ni'], N['zs'], N.get('nf', 0), N.get('nfi', 0)
q = np.frombuffer(raw, dtype=np.int16, count=nv0 * 4).reshape(-1, 4).astype(np.float64)
ix0 = np.frombuffer(raw, dtype=np.uint16, count=ni0, offset=nv0 * 8).astype(np.int64)
P = np.c_[q[:, 0] / 32000, q[:, 1] / 32000, q[:, 2] / 32000 / zs]; T = q[:, 3]
Pb = P[:nf].copy(); Pb[:, 2] *= -1; Tb = np.ones(nf)
V = np.r_[P, Pb]; TT = np.r_[T, Tb]
F0 = ix0.reshape(-1, 3); Fb = ix0[:nfi].reshape(-1, 3)[:, [0, 2, 1]] + nv0
F = np.r_[F0, Fb]
print('vertices', len(V), 'triangles', len(F), 'tags', sorted(set(TT.astype(int).tolist()))[:12], 'bbox', V.min(0).round(3), V.max(0).round(3))
bpy.ops.wm.read_factory_settings(use_empty=True)
# app space: x right, y up, z towards the viewer -> Blender Z up: (x, -z, y)
verts = [(float(x), float(-z), float(y)) for x, y, z in V]
m = bpy.data.meshes.new('logo_ref'); m.from_pydata(verts, [], F.tolist()); m.update()
o = bpy.data.objects.new('logo_ref', m); bpy.context.collection.objects.link(o)
c = m.color_attributes.new(name='COLOR_0', type='FLOAT_COLOR', domain='POINT')
for i, t in enumerate(TT): v = min(1., max(0., t / 4.)); c.data[i].color = (v, v, v, 1.)
for p in m.polygons: p.use_smooth = True
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_yup=True, export_animations=False)
# preview (Cycles, chrome-like)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 32; sc.cycles.device = 'CPU'; sc.render.resolution_x = sc.render.resolution_y = 520
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (.03, .04, .08, 1)
mt = bpy.data.materials.new('chrome'); mt.use_nodes = True; bs = mt.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = (.8, .85, .95, 1); bs.inputs['Metallic'].default_value = .9; bs.inputs['Roughness'].default_value = .22
m.materials.append(mt)
for e, a, en in ((50, 30, 5.), (-20, 200, 2.)):
    L = bpy.data.lights.new('l%d' % a, 'SUN'); L.energy = en; lo = bpy.data.objects.new('l%d' % a, L); sc.collection.objects.link(lo); lo.rotation_euler = (math.radians(90 - e), 0, math.radians(a))
cam = bpy.data.cameras.new('cam'); cam.lens = 60; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = Vector((0.9, -3.2, 0.5)); co.rotation_euler = (Vector((0, 0, 0)) - co.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = prev; bpy.ops.render.render(write_still=True); print('ok')
