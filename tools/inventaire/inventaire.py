#!/usr/bin/env python3
"""Inventaire du pack cosmique (assets/cosmic + assets/blender) : relit chaque fichier sur disque.
Sortie : docs/inventaire-pack-cosmique.json (une ligne par fichier). Relancer : python3 tools/inventaire/inventaire.py
Rien n'est supposé : dimensions lues dans les fichiers, usages trouvés par recherche dans index.html et les modules réellement importés."""
import hashlib, io, json, os, re, struct, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
SCAN = ['assets/cosmic', 'assets/blender']
idx = (ROOT / 'index.html').read_text(encoding='utf-8')

def closure(entry):
    seen, todo = set(), [entry]
    while todo:
        p = todo.pop()
        if p in seen or not p.exists(): continue
        seen.add(p)
        for m in re.finditer(r"""(?:import\s[^'"]*?from\s*|import\()\s*['"](\.{1,2}/[^'"?]+)""", p.read_text(encoding='utf-8')):
            todo.append((p.parent / m.group(1)).resolve())
    return seen
V10 = closure((ROOT / 'assets/cosmic/world-v10/focused-host.mjs').resolve())
V10 |= {(ROOT / 'assets/cosmic/world-v10/bake-worker.mjs').resolve()} | closure((ROOT / 'assets/cosmic/world-v10/bake-worker.mjs').resolve())
V10_GLSL = {(ROOT / 'assets/cosmic/world-v10' / n).resolve() for n in ['materials.glsl', 'relief-atmosphere.glsl', 'planet-fragment.glsl']}
runtime = json.loads(subprocess.check_output(['node', str(ROOT / 'tools/inventaire/runtime-paths.mjs')], cwd=ROOT))
v10src = '\n'.join(p.read_text(encoding='utf-8') for p in V10)
# Code non-runtime (tests, aperçus, outils) : un fichier cité seulement là est « référencé hors exécution ».
dev_src = ''
for p in (ROOT / 'assets/cosmic').rglob('*'):
    if p.suffix in ('.mjs', '.html', '.py', '.md', '.json') and p.resolve() not in V10: dev_src += p.read_text(encoding='utf-8', errors='ignore') + '\n'
for p in (ROOT / 'tests').glob('*'): dev_src += p.read_text(encoding='utf-8', errors='ignore')

KIND = {'.png': 'texture', '.webp': 'animation', '.gif': 'animation', '.glb': 'modèle 3D', '.glsl': 'shader', '.mjs': 'module JS',
        '.json': 'données', '.md': 'doc', '.py': 'script hors ligne', '.css': 'style', '.html': 'page de test'}

def glb_info(b):
    if b[:4] != b'glTF': return {'error': 'pas un GLB'}
    n = struct.unpack_from('<I', b, 12)[0]; j = json.loads(b[20:20 + n])
    tris = verts = 0
    for m in j.get('meshes', []):
        for pr in m.get('primitives', []):
            acc = j['accessors']
            pos = acc[pr['attributes']['POSITION']]['count']; verts += pos
            tris += (acc[pr['indices']]['count'] if 'indices' in pr else pos) // 3
    imgs = []
    if j.get('images'):
        off = 20 + n; blen = struct.unpack_from('<I', b, off)[0]; bin_ = b[off + 8: off + 8 + blen]
        for im in j['images']:
            if 'bufferView' in im:
                bv = j['bufferViews'][im['bufferView']]; data = bin_[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
                try: w, h = Image.open(io.BytesIO(data)).size
                except Exception: w = h = 0
                imgs.append({'w': w, 'h': h, 'sha': hashlib.sha256(data).hexdigest()[:12]})
    return {'triangles': tris, 'vertices': verts, 'materials': len(j.get('materials', [])), 'images': imgs,
            'animations': len(j.get('animations', [])), 'skins': len(j.get('skins', []))}

def licence_for(rel, models_lic):
    p = ROOT / rel
    for d in [p.parent, *p.parents]:
        if d == ROOT.parent: break
        for f in d.glob('*'):
            if re.match(r'(?i)(licen[cs]e|copying|credits?)(\.|$)', f.name): return f'fichier {f.relative_to(ROOT)}'
        if d == ROOT: break
    if rel in models_lic: return f'{models_lic[rel]} (déclarée dans models.json, aucun fichier LICENSE)'
    return 'aucun fichier de licence'

models_lic = {}
for mj in (ROOT / 'assets/cosmic').rglob('models.json'):
    for e in json.loads(mj.read_text()):
        if isinstance(e, dict) and e.get('license'): models_lic[str((mj.parent / e['file']).relative_to(ROOT))] = e['license']

rows = []
for base in SCAN:
    for p in sorted((ROOT / base).rglob('*')):
        if not p.is_file(): continue
        rel = str(p.relative_to(ROOT)); b = p.read_bytes(); ext = p.suffix.lower()
        r = {'path': rel, 'kind': KIND.get(ext, ext), 'format': ext[1:], 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
        if ext in ('.png', '.gif', '.webp'):
            try:
                im = Image.open(io.BytesIO(b)); r.update(w=im.size[0], h=im.size[1], mode=im.mode, frames=getattr(im, 'n_frames', 1))
                r['gpu'] = int(im.size[0] * im.size[1] * 4 * 4 / 3) * (1 if r['frames'] == 1 else 0)
                r['decoded'] = im.size[0] * im.size[1] * 4 * r['frames']
                if r['frames'] == 1 and im.mode in ('L', 'I;16', 'I') or (im.mode in ('RGB', 'RGBA') and r['frames'] == 1 and len(b) < 4096):
                    ext_ = im.convert('RGBA').getextrema(); r['flat'] = all(lo == hi for lo, hi in ext_[:3])
            except Exception as e: r['error'] = str(e)
        elif ext == '.glb':
            g = glb_info(b); r.update(g); r['gpu'] = g.get('triangles', 0) * 3 * 11 * 4   # décodage V10 : triangles dépliés, 11 floats/sommet
        name = p.name
        why = list(runtime.get(rel, []))
        if rel.startswith('assets/blender/relief/') and ('volcan-hn' in name or 'volcan-ao' in name): why.append('V9 par défaut (relief des volcans, ?relief=0 pour couper ; -512 au palier 0)')
        if rel.startswith('assets/blender/pbr-512/') and ext == '.png': why.append('V9 opt-in ?pbr=1 (PD9PBR) ; préréglages V10 dans full-potential.mjs, pas encore chargés')
        if p.resolve() in V10: why.append('module importé par le moteur V10 (focused-host.mjs)')
        if p.resolve() in V10_GLSL: why.append('shader chargé par program.mjs (V10)')
        if name in idx and not why: why.append('cité dans index.html')
        r['usage'] = why
        if why:
            r['state'] = 'utilisée'
        elif re.search(re.escape(name), dev_src) or re.search(re.escape(rel.split('/', 2)[-1]), dev_src):
            r['state'] = 'inutilisée à l\'exécution (citée par manifeste, doc ou test)'
        else: r['state'] = 'inutilisée (citée nulle part)'
        r['licence'] = licence_for(rel, models_lic)
        rows.append(r)
# Doublons exacts (même contenu)
by = {}
for r in rows: by.setdefault(r['sha256'], []).append(r['path'])
for r in rows:
    d = [x for x in by[r['sha256']] if x != r['path']]
    if d: r['duplicates'] = d
# Sous-exploitation : modèles d'une famille branchée dont la variante n'est pas chargée, textures de jeux dont un canal seulement est lu
used_fam = {re.sub(r'-0\d\.glb$', '', r['path']) for r in rows if r['state'] == 'utilisée' and r['path'].endswith('.glb')}
used_set = {re.sub(r'_(albedo|height|normal_object)\.png$', '', r['path']) for r in rows if r['state'] == 'utilisée' and 'procedural-v19' in r['path']}
for r in rows:
    if r['state'] != 'utilisée' and (re.sub(r'-0\d\.glb$', '', r['path']) in used_fam or re.sub(r'_(albedo|height|normal_object)\.png$', '', r['path']) in used_set or re.sub(r'_lod\d\.glb$', '', r['path']) in used_set):
        r['state'] = 'sous-exploitée (jeu branché, ce fichier non chargé)'
out = ROOT / 'docs/inventaire-pack-cosmique.json'
out.write_text(json.dumps({'generated_by': 'tools/inventaire/inventaire.py', 'files': rows}, ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
print(len(rows), 'fichiers ->', out.relative_to(ROOT))
