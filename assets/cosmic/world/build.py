import json
from pathlib import Path
p=Path(__file__).parent
names=['Tellurique','Océanique','Géante gazeuse','Glacée','Volcanique','Cristalline','Spectrale','Mystique','Étoile','Métallique','Rocheuse','Terre']
families=[['plateaux','canyons','massifs','dunes'],['archipels','lagons','falaises','houles'],['bandes','cyclones','vortex','nuages'],['glaciers','crevasses','banquises','pics'],['volcans','caldeiras','coulées','champs basaltiques'],['prismes','géodes','aiguilles','amas'],['brumes','filaments','aurores','vortex'],['arches','brumes','spirales','pics'],['granulation','protubérances','taches','boucles'],['crêtes','bassins','filons','plateaux'],['cratères','éboulis','massifs','canyons'],['montagnes','forêts','déserts','rivières']]
profiles=[]
for i,name in enumerate(names):
 for j,f in enumerate(families[i]):
  for k in range(8):
   profiles.append(dict(id=f'p{i}-{j}-{k}',type=i,name=name,family=f,variant=k,detail=round(.85+.04*k,2),amplitude=round(.82+.05*((k+j)%8),2),scale=round(.8+.06*((k+2*j)%8),2),roughness=round(.85+.04*((k+3*j)%8),2),status='proposal: bind to verified branch before use'))
(p/'planet-profiles.json').write_text(json.dumps(profiles,ensure_ascii=False,indent=2))
