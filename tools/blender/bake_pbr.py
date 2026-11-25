"""Bake generated .blend planets to optional WebGL PBR maps.
Usage: blender -b --python tools/blender/bake_pbr.py -- --input blender-output --output blender-output/pbr --width 1024
Run generate.py first. No existing application assets are overwritten.
"""
import argparse
import json
import sys
from pathlib import Path
import bpy

def arguments():
    p = argparse.ArgumentParser()
    p.add_argument("--input", default="blender-output")
    p.add_argument("--output", default="blender-output/pbr")
    p.add_argument("--width", type=int, choices=(256, 512, 1024, 2048), default=1024)
    return p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])

def bake(obj, material, kind, path, width):
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    image = bpy.data.images.new(path.stem, width=width, height=width//2, alpha=False)
    image.colorspace_settings.name = "sRGB" if kind == "albedo" else "Non-Color"
    target = nodes.new("ShaderNodeTexImage")
    target.image = image
    for node in nodes:
        node.select = False
    target.select = True
    nodes.active = target
    scene = bpy.context.scene
    scene.render.bake.margin = 8
    scene.render.bake.use_clear = True
    scene.render.bake.normal_space = 'TANGENT'
    scene.render.bake.normal_r = 'POS_X'
    scene.render.bake.normal_g = 'POS_Y'
    scene.render.bake.normal_b = 'POS_Z'
    output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
    surface = output.inputs["Surface"]
    original = surface.links[0].from_socket
    emission = None
    try:
        if kind == "normal":
            bpy.ops.object.bake(type='NORMAL')
        else:
            bs = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
            source = bs.inputs["Base Color" if kind == "albedo" else "Roughness"]
            emission = nodes.new("ShaderNodeEmission")
            if source.is_linked:
                links.new(source.links[0].from_socket, emission.inputs["Color"])
            else:
                value = source.default_value
                emission.inputs["Color"].default_value = tuple(value) if kind == "albedo" else (value,value,value,1)
            links.new(emission.outputs[0], surface)
            bpy.ops.object.bake(type='EMIT')
        image.filepath_raw = str(path)
        image.file_format = 'PNG'
        image.save()
    finally:
        if emission is not None:
            nodes.remove(emission)
            links.new(original, surface)
        nodes.remove(target)
        bpy.data.images.remove(image)

def main():
    args = arguments()
    source = Path(args.input).resolve()
    destination = Path(args.output).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    entries = {}
    for name in ("basalt", "ocean", "ice", "desert", "gas"):
        blend = source / (name + ".blend")
        if not blend.is_file():
            raise RuntimeError(f"Missing generated planet: {blend}")
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = 16
        # Baking must also work on CPU-only builds without OIDN.
        scene.cycles.device = 'CPU'
        scene.cycles.use_denoising = False
        for layer in scene.view_layers:
            layer.cycles.use_denoising = False
        candidates = [o for o in scene.objects if o.type == 'MESH' and o.data.uv_layers and len(o.data.materials)==1]
        if len(candidates) != 1:
            raise RuntimeError(f"{name}: expected exactly one UV mesh with one material")
        obj = candidates[0]
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        material = obj.data.materials[0]
        if material is None or not material.use_nodes:
            raise RuntimeError(f"{name}: missing node material")
        maps = {}
        for kind in ("albedo", "normal", "roughness"):
            filename = f"{name}-{kind}.png"
            bake(obj, material, kind, destination / filename, args.width)
            maps[kind] = filename
        entries[name] = maps
    if not entries:
        raise RuntimeError("No generated blend files found")
    manifest = {"version":1,"width":args.width,"height":args.width//2,
                "uv":"source Blender sphere UV","normalConvention":"+X +Y +Z tangent",
                "colorSpace":{"albedo":"srgb","normal":"linear","roughness":"linear"},
                "presets":entries}
    temp = destination / "manifest.json.tmp"
    temp.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    temp.replace(destination / "manifest.json")

if __name__ == "__main__":
    main()
