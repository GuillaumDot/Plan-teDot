import numpy as np, trimesh, math, json, os
from PIL import Image, ImageDraw
from pathlib import Path
P=Path(__file__).parent
skin=(205,153,115); hair=(49,32,29); shoe=(30,34,45)
def ell(c,s,col):
 m=trimesh.creation.icosphere(subdivisions=1);m.vertices*=s;m.vertices+=c;m.visual.face_colors=(*col,255);return m
def limb(a,b,r,col):
 a,b=np.array(a),np.array(b); d=b-a;m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(d),sections=10);m.apply_transform(trimesh.geometry.align_vectors([0,0,1],d));m.apply_translation((a+b)/2);m.visual.face_colors=(*col,255);return m
def pose(t,kind,v):
 q=2*math.pi*t; s=math.sin(q); c=math.cos(q); outfit=[(100,66,184),(190,55,78),(36,125,156)][v]; pants=(45,48,65); x=.13*s; z=1.05+.045*math.cos(2*q); hip=np.array([x,0,z]); chest=hip+np.array([.07*c,0,.48]); head=chest+[0,0,.32]; parts=[ell(hip,[.19,.13,.17],pants),ell(chest-[0,0,.17],[.23,.14,.32],outfit),ell(head,[.125,.115,.16],skin),ell(head+[0,.015,.085],[.13,.12,.09],hair),limb(chest+[0,0,.08],head,.065,skin)]
 for side in [-1,1]:
  a=hip+[side*.12,0,0]; foot=np.array([side*(.22+.08*side*s),.11*side*c,.09+.12*max(0,side*s)]); knee=(a+foot)/2+[.04*side,-.15,0]; parts += [limb(a,knee,.09,pants),ell(knee,[.09]*3,pants),limb(knee,foot,.07,pants),ell(foot+[0,-.06,-.035],[.085,.15,.065],shoe)]
  shoulder=chest+[side*.22,0,0];
  if kind=='dance': elbow=shoulder+[side*.22,.04*side*s,.20*side*c]; hand=elbow+[side*.12,-.12,.23*side*s+.10]
  elif kind=='applause': elbow=shoulder+[side*.18,-.15,-.14]; hand=chest+[side*(.045+.18*(1+c)/2),-.38,-.02]
  elif kind=='celebrate': elbow=shoulder+[side*.20,0,.22]; hand=elbow+[side*.10,-.04,.25+.08*s]
  else: elbow=shoulder+[side*.18,-.08,-.18]; hand=chest+[side*.13,-.25,.10+.07*s]
  parts += [limb(shoulder,elbow,.075,outfit),ell(elbow,[.065]*3,skin),limb(elbow,hand,.05,skin),ell(hand,[.065,.045,.075],skin)]
 for side in [-1,1]:parts.append(ell(head+[side*.044,-.103,.025],[.014,.009,.012],(35,29,30)))
 return trimesh.util.concatenate(parts)
def render(m):
 V=m.vertices; F=m.faces; cam=np.array([.45,-1,.28]);cam/=np.linalg.norm(cam); right=np.cross([0,0,1],cam);right/=np.linalg.norm(right); up=np.cross(cam,right); xy=np.stack([V@right,V@up],1)*67;xy[:,0]+=96;xy[:,1]=165-xy[:,1]; depth=V@cam; im=Image.new('RGBA',(192,192)); d=ImageDraw.Draw(im); light=np.array([-.4,-.7,1]);light/=np.linalg.norm(light); colors=m.visual.face_colors; normals=m.face_normals
 for i in np.argsort(depth[F].mean(1)):
  if normals[i]@cam<=0:continue
  shade=.53+.47*max(0,normals[i]@light); col=tuple(np.clip(colors[i,:3]*shade,0,255).astype(int))+(255,);d.polygon([tuple(p) for p in xy[F[i]]],fill=col)
 return im
manifest=[]
for kind in ['dance','applause','celebrate','emotion']:
 for v in range(3):
  name=f'{kind}-{v+1}'; frames=[]; folder=P/name;folder.mkdir(exist_ok=True)
  for i in range(24):
   m=pose(i/24,kind,v);frames.append(render(m));m.export(folder/f'{i:02}.glb')
  frames[0].save(P/f'{name}.gif',save_all=True,append_images=frames[1:],duration=70,loop=0,disposal=2,transparency=0);frames[0].save(P/f'{name}.png');manifest.append(dict(id=name,gif=name+'.gif',frames=[f'{name}/{i:02}.glb' for i in range(24)]))
(P/'manifest.json').write_text(json.dumps(manifest,indent=2))
