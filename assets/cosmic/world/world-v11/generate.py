import trimesh as t, numpy as np, json, pathlib
P=pathlib.Path(__file__).parent
rows=[]
for family in ['cottage','chalet','townhouse','apartment','tower','factory','church','castle','barn','market','station','lighthouse','warehouse','fort','greenhouse','windmill']:
 for v in range(8):
  rng=np.random.default_rng(1100+v); s=t.Scene(); parts={}; stone=[150,139,120,255]; roof=[92,65,53,255]; glass=[54,88,107,255]; wood=[105,75,49,255]
  def add(m,c,role):
   m.visual.face_colors=c; parts[role]=parts.get(role,0)+len(m.faces); s.add_geometry(m)
  def box(w,d,h,x=0,y=0,z=0,c=stone,role='structure'):
   m=t.creation.box(extents=[w,d,h]);m.apply_translation([x,y,z+h/2]);add(m,c,role)
  def cyl(r,h,x,y,z,c=stone,role='structure',n=12):
   m=t.creation.cylinder(radius=r,height=h,sections=n);m.apply_translation([x,y,z+h/2]);add(m,c,role)
  def gable(w,d,h,z,x=0,y=0):
   a=np.array([[-w/2,-d/2,0],[w/2,-d/2,0],[0,-d/2,h],[-w/2,d/2,0],[w/2,d/2,0],[0,d/2,h]])+[x,y,z];m=t.Trimesh(vertices=a,faces=[[0,2,1],[3,4,5],[0,1,4],[0,4,3],[0,3,5],[0,5,2],[1,2,5],[1,5,4]],process=True);add(m,roof,'roof')
  def block(w,d,f,x=0,y=0,z=0,bal=False):
   h=f*.42;box(w,d,h,x,y,z); cols=max(2,int(w/.32));
   for k in range(f):
    for j in range(cols):
     xx=x+w*((j+.5)/cols-.5)
     for side in [-1,1]:
      box(.13,.025,.20,xx,y+side*(d/2+.014),z+k*.42+.12,glass,'window')
      if bal and k>0:box(.24,.12,.035,xx,y+side*(d/2+.06),z+k*.42+.08,stone,'balcony')
   return h
  w=1.1+.13*(v%4); d=.9+.15*(v//4); box(w*1.1,d*1.1,.08,z=0,role='foundation')
  if family in ['castle','fort']:
   for x in [-w*.48,w*.48]:
    for y in [-d*.48,d*.48]:
     h=.65+.14*(v%3);cyl(.19,h,x,y,.08,n=8 if v%2 else 12)
     for j in range(4):
      a=j*np.pi/2;box(.09,.09,.12,x+.15*np.cos(a),y+.15*np.sin(a),h+.08,role='battlement')
   for y in [-d*.48,d*.48]:box(w,.10,.48,0,y,.08)
   for x in [-w*.48,w*.48]:box(.10,d,.48,x,0,.08)
   if family=='castle':h=block(w*.45,d*.5,2+v%3,z=.08);gable(w*.5,d*.55,.25,h+.08)
  elif family=='lighthouse':
   for k in range(3):cyl(.23-k*.035,.48,0,0,.08+k*.48,c=stone if k%2==0 else roof)
   cyl(.24,.08,0,0,1.52);cyl(.16,.25,0,0,1.60,glass,'lantern');cyl(.23,.08,0,0,1.85,roof,'roof')
  elif family=='tower':
   z=.08
   for k in range(2+v%3):
    h=block(w*(1-.15*k),d*(1-.15*k),3+v%2,z=z);z+=h;box(w*(1-.15*k)*1.03,d*(1-.15*k)*1.03,.035,z=z,role='cornice');z+=.035
   box(.035,.035,.35,z=z,c=wood,role='antenna')
  else:
   f=3+v%3 if family=='apartment' else 1+v%2 if family in ['cottage','chalet','townhouse'] else 2
   h=block(w,d,f,z=.08,bal=family in ['chalet','apartment','townhouse'] and v%2==0)+.08
   if family in ['apartment','warehouse','factory']:box(w*1.04,d*1.04,.07,z=h,c=roof,role='roof')
   else:gable(w*1.12,d*1.12,.22+.08*(v%3),h)
   box(.19,.035,.28,0,-d/2-.025,.08,wood,'door')
   if family in ['factory','cottage','chalet','barn']: 
    for j in range(1+v%3 if family=='factory' else 1):cyl(.065,.42+j*.12,w*.3-j*.19,0,h,roof,'chimney',8)
   if family=='church':
    box(.32,.32,h+.32,0,-d*.45,.08);gable(.36,.36,.35,h+.40,0,-d*.45)
   if family in ['station','market']: 
    for j in range(4):box(.055,.055,.42,w*(j/3-.5),-d*.72,.08,wood,'column')
    box(w*1.1,.35,.06,0,-d*.65,.50,roof,'canopy')
   if family=='greenhouse':
    for j in range(5):box(.035,d,.035,w*(j/4-.5),0,h+.04,wood,'frame')
   if family=='windmill':
    for a in [v*.12,v*.12+np.pi/2]:
     m=t.creation.box(extents=[1.3,.035,.12]);m.apply_transform(t.transformations.rotation_matrix(a,[0,1,0]));m.apply_translation([0,-d*.58,h*.75]);add(m,wood,'blade')
   if family in ['cottage','chalet','barn'] and v>=4:box(w*.42,d*.65,.42,w*.65,0,.08);gable(w*.48,d*.72,.2,.5,w*.65)
  s.apply_transform(t.transformations.rotation_matrix(-np.pi/2,[1,0,0])); fn=f'{family}-{v:02}.glb';(P/fn).write_bytes(s.export(file_type='glb')); loaded=t.load(P/fn,force='scene'); assert np.isfinite(loaded.bounds).all(); rows.append(dict(file=fn,family=family,variant=v,triangles=sum(parts.values()),parts=parts,up='Y',placement='base center',native='reference only'))
(P/'models.json').write_text(json.dumps(rows,indent=2));print(len(rows),max(r['triangles'] for r in rows))
