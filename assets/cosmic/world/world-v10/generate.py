import trimesh as t, numpy as np, json, pathlib
P=pathlib.Path(__file__).parent
families={'cottage':(1,1,1),'chalet':(1.3,1,1.2),'barn':(1.8,1.2,1.1),'townhouse':(.8,1,2),'apartment':(1.5,1.2,3),'tower':(1,1,6),'factory':(2,1.4,1.4),'warehouse':(2.5,1.5,1),'church':(1,1.8,1.4),'castle':(2,2,1.5),'lighthouse':(.6,.6,4),'windmill':(.8,.8,2),'station':(2.5,1.2,1.3),'market':(1.5,1.3,.8),'greenhouse':(1.8,1,.8),'fort':(2,2,.8)}
rows=[]
for i,(name,(w,d,h)) in enumerate(families.items()):
 for v in range(6):
  rng=np.random.default_rng(i*100+v); W,D,H=np.array([w,d,h])*rng.uniform(.85,1.15,3); scene=t.Scene(); color=[int(x) for x in rng.integers(105,210,3)]+[255]
  def box(e,p,c):
   m=t.creation.box(extents=e); m.apply_translation(p); m.visual.face_colors=c; scene.add_geometry(m)
  box([W,D,H],[0,0,H/2],color)
  if name in ['cottage','chalet','barn','townhouse','church','station','market','greenhouse']:
   z=H+min(W,D)*.35; verts=[[-W*.55,-D*.55,H],[W*.55,-D*.55,H],[0,-D*.55,z],[-W*.55,D*.55,H],[W*.55,D*.55,H],[0,D*.55,z]]; m=t.Trimesh(vertices=verts,faces=[[0,1,2],[3,5,4],[0,3,4],[0,4,1],[0,2,5],[0,5,3],[1,4,5],[1,5,2]],process=True); m.visual.face_colors=[95,60,49,255];scene.add_geometry(m)
  else: box([W*1.04,D*1.04,.07],[0,0,H+.035],[100,105,110,255])
  floors=max(1,min(9,int(H/.45))); cols=max(2,int(W/.3))
  for f in range(floors):
   for j in range(cols):
    x=W*((j+.5)/cols-.5); z=H*(f+.55)/floors; box([W/cols*.46,.025,H/floors*.36],[x,-D/2-.013,z],[48,80,100,255]);box([W/cols*.46,.025,H/floors*.36],[x,D/2+.013,z],[48,80,100,255])
  box([W*.18,.035,min(.4,H*.5)],[0,-D/2-.02,min(.4,H*.5)/2],[75,53,36,255])
  if name in ['castle','fort']:
   for x in [-W*.43,W*.43]:
    for y in [-D*.43,D*.43]: box([W*.25,D*.25,H*1.5],[x,y,H*.75],color)
  if name in ['factory','cottage','barn','chalet']: box([W*.12,D*.12,H*.45],[W*.3,0,H*1.12],[100,70,60,255])
  if name=='church': box([W*.28,D*.28,H*.9],[0,-D*.32,H*1.3],color)
  if name=='windmill':
   for a in [0,np.pi/2]:
    m=t.creation.box(extents=[W*2,.05,W*.16]);m.apply_transform(t.transformations.rotation_matrix(a,[0,1,0]));m.apply_translation([0,-D*.55,H*.8]);m.visual.face_colors=[150,120,80,255];scene.add_geometry(m)
  # Convert Z-up construction to glTF Y-up.
  scene.apply_transform(t.transformations.rotation_matrix(-np.pi/2,[1,0,0])); fn=f'{name}-{v:02}.glb'; (P/fn).write_bytes(scene.export(file_type='glb')); rows.append(dict(file=fn,family=name,variant=v,triangles=sum(len(g.faces) for g in scene.geometry.values()),license='CC0-1.0',source='original procedural prototype',up='Y',placement='base center',native='lot97/roof97/wall97 reference'))
(P/'models.json').write_text(json.dumps(rows,indent=2))
