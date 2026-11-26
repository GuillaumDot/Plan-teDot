"""PlanèteDot V9.4 · cuisson « vue de dessus » d'un relief Blender pour le shader de la planète.
Entrée : un champ de hauteur .npz (h, lava, gully en lignes de bas en haut) OU un .glb (relief +Y en haut, rayon 1 = pied).
Sortie (RGB 8 bits, sans alpha : Safari dégrade les couleurs des images à alpha) :
  <nom>-hn.png : R,G = normale tangente (OpenGL, X = +u, Y = +v), B = hauteur / hmax
  <nom>-ao.png : R = occlusion ambiante cuite (Cycles), G = lave, B = ravines
Cadrage : carré d dans [-1.25, 1.25]^2 (repère vH93), Blender X = u, Y = v, Z = hauteur.
Usage : python bake_relief.py --npz volcan.npz --out DIR --name volcan --size 1024 [--preview]"""
import bpy, numpy as np, argparse, json, os, sys, time

ap = argparse.ArgumentParser()
ap.add_argument('--npz'); ap.add_argument('--glb'); ap.add_argument('--out', required=True); ap.add_argument('--name', default='stamp')
ap.add_argument('--size', type=int, default=1024); ap.add_argument('--grid', type=int, default=1024); ap.add_argument('--ao-samples', type=int, default=96)
ap.add_argument('--ao-dist', type=float, default=.18); ap.add_argument('--preview', action='store_true')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
os.makedirs(a.out, exist_ok=True); t0 = time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def resample(arr, M):
    N = arr.shape[0]
    if N == M: return arr
    t = (np.arange(M) + .5) * N / M - .5; i0 = np.clip(np.floor(t).astype(int), 0, N - 1); i1 = np.clip(i0 + 1, 0, N - 1); w = t - np.floor(t)
    b = arr[i0] * (1 - w)[:, None] + arr[i1] * w[:, None]
    return b[:, i0] * (1 - w)[None] + b[:, i1] * w[None]

def grid_object(h, cols):
    """Maillage grille (M x M sommets) sur [-1.25, 1.25]^2, ligne 0 = bas (Y = -1.25)."""
    M = h.shape[0]; x = (np.arange(M) + .5) / M * 2.5 - 1.25
    X, Y = np.meshgrid(x, x)
    co = np.stack([X.ravel(), Y.ravel(), h.ravel()], 1).astype(np.float32)
    i = np.arange(M - 1); I, J = np.meshgrid(i, i)
    v0 = (J * M + I).ravel()
    quads = np.stack([v0, v0 + 1, v0 + M + 1, v0 + M], 1).astype(np.int32)
    me = bpy.data.meshes.new('relief'); me.vertices.add(len(co)); me.vertices.foreach_set('co', co.ravel())
    me.loops.add(quads.size); me.loops.foreach_set('vertex_index', quads.ravel())
    me.polygons.add(len(quads)); me.polygons.foreach_set('loop_start', np.arange(0, quads.size, 4, dtype=np.int32))
    try: me.polygons.foreach_set('loop_total', np.full(len(quads), 4, np.int32))
    except Exception: pass
    me.update(calc_edges=True); me.validate()
    me.polygons.foreach_set('use_smooth', np.ones(len(quads), bool))
    at = me.color_attributes.new('mask', 'FLOAT_COLOR', 'POINT')
    at.data.foreach_set('color', np.concatenate([cols, np.ones((len(co), 1), np.float32)], 1).ravel())
    ob = bpy.data.objects.new('relief', me); sc.collection.objects.link(ob); return ob

if a.npz:
    z = np.load(a.npz); h = resample(z['h'].astype(np.float64), a.grid)
    cols = np.stack([resample(z['lava'], a.grid).ravel(), resample(z['gully'], a.grid).ravel(), np.zeros(a.grid * a.grid)], 1).astype(np.float32)
    ob = grid_object(h.astype(np.float32), cols); hmax = float(h.max())
else:
    bpy.ops.import_scene.gltf(filepath=a.glb)   # glTF +Y haut -> Blender +Z haut
    hmax = max(max(v.co.z for v in o.data.vertices) for o in sc.objects if o.type == 'MESH')

cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.5; cam.clip_end = 50
co = bpy.data.objects.new('cam', cam); co.location = (0, 0, 10); sc.collection.objects.link(co); sc.camera = co
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes.get('Background')
if bg: bg.inputs[1].default_value = 0.
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
sc.render.resolution_x = sc.render.resolution_y = a.size; sc.render.resolution_percentage = 100
sc.cycles.filter_width = 1.0; sc.render.film_transparent = False
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'

def emit_mat(name, build):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.
    nt.links.new(em.outputs[0], out.inputs['Surface']); build(nt, em.inputs['Color']); return m

def b_height(nt, dst):
    g = nt.nodes.new('ShaderNodeNewGeometry'); s = nt.nodes.new('ShaderNodeSeparateXYZ'); d = nt.nodes.new('ShaderNodeMath')
    d.operation = 'DIVIDE'; d.inputs[1].default_value = hmax
    nt.links.new(g.outputs['Position'], s.inputs[0]); nt.links.new(s.outputs['Z'], d.inputs[0]); nt.links.new(d.outputs[0], dst)
def b_normal(nt, dst):
    g = nt.nodes.new('ShaderNodeNewGeometry'); v = nt.nodes.new('ShaderNodeVectorMath'); v.operation = 'MULTIPLY_ADD'
    v.inputs[1].default_value = (.5, .5, .5); v.inputs[2].default_value = (.5, .5, .5)
    nt.links.new(g.outputs['Normal'], v.inputs[0]); nt.links.new(v.outputs[0], dst)
def b_ao(nt, dst):
    o = nt.nodes.new('ShaderNodeAmbientOcclusion'); o.samples = 16; o.inputs['Distance'].default_value = a.ao_dist
    nt.links.new(o.outputs['AO'], dst)
def b_mask(nt, dst):
    c = nt.nodes.new('ShaderNodeVertexColor'); c.layer_name = 'mask'; nt.links.new(c.outputs['Color'], dst)

def render(mat, samples, tag):
    sc.view_layers[0].material_override = mat; sc.cycles.samples = samples
    p = os.path.join(a.out, f'_{a.name}-{tag}.exr'); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(p); px = np.empty(a.size * a.size * 4, np.float32); im.pixels.foreach_get(px)
    bpy.data.images.remove(im); os.remove(p)
    print(f'  passe {tag} : {time.time() - t0:.1f} s', flush=True)
    return px.reshape(a.size, a.size, 4)   # ligne 0 = bas

H = render(emit_mat('h', b_height), 4, 'h')[..., 0]
NRM = render(emit_mat('n', b_normal), 4, 'n')[..., :3]
AO = render(emit_mat('ao', b_ao), a.ao_samples, 'ao')[..., 0]
MK = render(emit_mat('m', b_mask), 4, 'm')[..., :3] if a.npz else np.zeros((a.size, a.size, 3), np.float32)

def blur(x, it=1):
    for _ in range(it): x = (4 * x + np.roll(x, 1, 0) + np.roll(x, -1, 0) + np.roll(x, 1, 1) + np.roll(x, -1, 1)) / 8
    return x
AO = blur(AO, 1)

def save_rgb(arr, path):
    """arr : (S, S, 3) dans 0..1, ligne 0 = bas ; écrit un PNG RGB 8 bits sans conversion de couleur."""
    S = arr.shape[0]; im = bpy.data.images.new(os.path.basename(path), S, S, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    rgba = np.concatenate([np.clip(arr, 0, 1), np.ones((S, S, 1))], 2).astype(np.float32)
    im.pixels.foreach_set(rgba.ravel()); im.filepath_raw = path; im.file_format = 'PNG'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.color_depth = '8'
    im.save_render(path, scene=sc) if False else im.save(); bpy.data.images.remove(im)

hn = np.dstack([NRM[..., 0], NRM[..., 1], np.clip(H, 0, 1)])
ao = np.dstack([AO, MK[..., 0], MK[..., 1]])
save_rgb(hn, os.path.join(a.out, f'{a.name}-hn.png')); save_rgb(ao, os.path.join(a.out, f'{a.name}-ao.png'))
man = {'nom': a.name, 'taille': a.size, 'cadrage': [-1.25, 1.25], 'hmax': round(hmax, 5), 'repere': 'vH93 : rayon 1 = pied du volcan',
       'hn': 'R,G normale tangente OpenGL (X=+u, Y=+v), B = hauteur/hmax', 'ao': 'R occlusion, G lave, B ravines',
       'blender': bpy.app.version_string, 'ao_distance': a.ao_dist}
json.dump(man, open(os.path.join(a.out, f'{a.name}.json'), 'w'), ensure_ascii=False, indent=1)
print('hauteur max', hmax, 'occlusion min', float(AO.min()), 'moyenne', float(AO.mean()))

if a.preview:   # aperçu éclairé (soleil rasant) pour la revue
    sc.view_layers[0].material_override = None
    m = bpy.data.materials.new('pv'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (.16, .14, .12, 1); bs.inputs['Roughness'].default_value = .9
    vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'mask'; sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(vc.outputs[0], sp.inputs[0])
    mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.inputs[1].default_value = 6.; nt.links.new(sp.outputs[0], mu.inputs[0])
    nt.links.new(mu.outputs[0], bs.inputs['Emission Strength']); bs.inputs['Emission Color'].default_value = (1, .35, .06, 1)
    for o in sc.objects:
        if o.type == 'MESH': o.data.materials.clear(); o.data.materials.append(m)
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 4.; sun.angle = .05
    so = bpy.data.objects.new('sun', sun); so.rotation_euler = (1.05, 0., -2.3); sc.collection.objects.link(so)
    bg.inputs[0].default_value = (.35, .4, .5, 1); bg.inputs[1].default_value = .35
    cam.type = 'PERSP'; cam.lens = 50; co.location = (0, -3.6, 2.6); co.rotation_euler = (0.94, 0, 0)
    sc.cycles.samples = 48; sc.render.resolution_x = 960; sc.render.resolution_y = 640; sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'; sc.render.image_settings.color_mode = 'RGB'
    sc.render.filepath = os.path.join(a.out, f'{a.name}-apercu.png'); bpy.ops.render.render(write_still=True)
print(f'fini en {time.time() - t0:.1f} s')
