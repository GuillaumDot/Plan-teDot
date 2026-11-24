import bpy
import math
import os
from pathlib import Path

out = Path("blender-output").resolve()
out.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new("Space")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.008,0.012,0.025,1)
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=64)
planet = bpy.context.object
for p in planet.data.polygons:
    p.use_smooth = True

# Linear RGB palettes, roughness, relief, cloud/band scale.
PRESETS = {
    "basalt": ([(.025,.018,.014),(.16,.065,.025),(.45,.26,.12)], .82,.35,7),
    "ocean": ([(.004,.018,.055),(.015,.19,.28),(.58,.78,.82)], .32,.12,4),
    "ice": ([(.025,.09,.18),(.22,.52,.72),(.83,.92,.98)], .48,.24,9),
    "desert": ([(.09,.025,.008),(.45,.18,.045),(.85,.58,.24)], .86,.28,5),
    "gas": ([(.08,.035,.12),(.48,.19,.32),(.91,.65,.38)], .68,.04,3),
}

def material(name, palette, roughness, relief, scale):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    bs = n.get("Principled BSDF")
    bs.inputs["Roughness"].default_value = roughness
    coord = n.new("ShaderNodeTexCoord")
    mapping = n.new("ShaderNodeVectorMath")
    mapping.operation = 'MULTIPLY'
    mapping.inputs[1].default_value = (1,1,9) if name == "gas" else (1,1,1)
    l.new(coord.outputs["Generated"], mapping.inputs[0])
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 5
    noise.inputs["Roughness"].default_value = .65
    noise.inputs["Distortion"].default_value = .35
    l.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    for element, pos, rgb in zip([ramp.color_ramp.elements[0], ramp.color_ramp.elements.new(.5), ramp.color_ramp.elements[-1]], [.18,.5,.82], palette):
        element.position = pos
        element.color = (*rgb,1)
    l.new(noise.outputs["Fac"], ramp.inputs[0])
    l.new(ramp.outputs[0], bs.inputs["Base Color"])
    fine = n.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 65
    fine.inputs["Detail"].default_value = 3
    l.new(coord.outputs["Generated"], fine.inputs["Vector"])
    micro = n.new("ShaderNodeBump")
    micro.inputs["Strength"].default_value = relief * .4
    micro.inputs["Distance"].default_value = .035
    l.new(fine.outputs["Fac"], micro.inputs["Height"])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = relief
    bump.inputs["Distance"].default_value = .12
    l.new(noise.outputs["Fac"], bump.inputs["Height"])
    l.new(micro.outputs["Normal"], bump.inputs["Normal"])
    l.new(bump.outputs["Normal"], bs.inputs["Normal"])
    return mat

def aim(obj):
    obj.rotation_euler = (-obj.location).to_track_quat('-Z','Y').to_euler()

bpy.ops.object.camera_add(location=(0,-4,1))
scene.camera = bpy.context.object
aim(scene.camera)
for loc,power,color in [((3,-4,4),700,(1,.8,.6)),((-3,1,2),350,(.3,.5,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object
    light.data.energy=power
    light.data.color=color
    light.data.shape='DISK'
    light.data.size=3
    aim(light)
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
# Default retains the original basalt artifact and adds four independent previews.
selected = os.environ.get("PD_PLANETS", ",".join(PRESETS)).split(",")
for name in selected:
    name = name.strip()
    if name not in PRESETS:
        raise ValueError("Unknown planet preset: " + name)
    planet.data.materials.clear()
    planet.data.materials.append(material(name, *PRESETS[name]))
    scene.render.filepath = str(out / (name + "-preview.png"))
    bpy.ops.wm.save_as_mainfile(filepath=str(out / (name + ".blend")))
    bpy.ops.render.render(write_still=True)
