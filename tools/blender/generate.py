import bpy
import math
from pathlib import Path
from mathutils import Vector

out = Path("blender-output")
out.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Space")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.008,0.012,0.025,1)
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32)
planet = bpy.context.object
for p in planet.data.polygons: p.use_smooth = True
mat = bpy.data.materials.new("Basalt")
mat.use_nodes = True
planet.data.materials.append(mat)
n = mat.node_tree.nodes
l = mat.node_tree.links
bs = n.get("Principled BSDF")
noise = n.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 7
noise.inputs["Detail"].default_value = 5
ramp = n.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.025,0.018,0.014,1)
ramp.color_ramp.elements[1].color = (0.45,0.26,0.12,1)
l.new(noise.outputs["Fac"],ramp.inputs[0])
l.new(ramp.outputs[0],bs.inputs["Base Color"])
bump = n.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.35
l.new(noise.outputs["Fac"],bump.inputs["Height"])
l.new(bump.outputs[0],bs.inputs["Normal"])
def aim(obj): obj.rotation_euler = (-obj.location).to_track_quat('-Z','Y').to_euler()
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
scene.render.filepath=str(out.resolve() / "basalt-preview.png")
bpy.ops.wm.save_as_mainfile(filepath=str(out.resolve() / "basalt.blend"))
bpy.ops.render.render(write_still=True)
