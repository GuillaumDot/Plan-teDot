FAMILIES = {
'housing': ('abri','cabane','maisonnette','maison','villa','maison mitoyenne','petit collectif','residence','immeuble','tour','gratte-ciel','supertour'),
'industry': ('atelier','hangar','manufacture','usine','complexe','raffinerie'),
'agriculture': ('potager','champ','ferme','verger','serres','exploitation'),
'commerce': ('etal','kiosque','boutique','marche','galerie','centre commercial'),
'civic': ('chapelle','ecole','mairie','clinique','hopital','universite'),
'energy': ('panneau','station solaire','eolienne','parc solaire','centrale','complexe energetique'),
'port': ('ponton','jetee','petit port','marina','port commercial','terminal'),
'road': ('sentier','chemin','route','avenue','boulevard','echangeur'),
'mountain': ('butte','colline','petite montagne','montagne','pic','massif','chaine','grande chaine'),
'forest': ('pousse','arbuste','jeune arbre','arbre','bosquet','bois','foret','foret dense'),
'volcano': ('fissure','event','cone','cratere','volcan','stratovolcan','massif','caldeira'),
'dune': ('ride','banc','petite dune','dune','grande dune','champ de dunes'),
'island': ('rocher','ilot','ile','grande ile','archipel','archipel etendu'),
'ice': ('neige','neve','petit glacier','glacier','champ de glace','calotte'),
'water': ('mare','etang','lac','grand lac','mer','ocean'),
'weather': ('brume','nuage','amas','front','tempete','cyclone'),
'reef': ('polype','colonie','petit recif','recif','barriere','atoll'),
}
PALETTES={'earth':((.46,.36,.25),(.19,.36,.12)), 'water':((.32,.53,.61),(.06,.36,.42)), 'desert':((.74,.48,.24),(.51,.27,.10)), 'volcanic':((.19,.17,.16),(.75,.13,.025)), 'ice':((.72,.83,.91),(.24,.48,.68)), 'future':((.35,.42,.5),(.08,.65,.8)), 'gas':((.63,.38,.23),(.84,.65,.44))}
VARIANTS=8

def allowed(b,f):
 return (f=='weather') if b=='gas' else (f!='reef' or b in ('earth','water'))
def entries():
 for b in PALETTES:
  for f,stages in FAMILIES.items():
   if allowed(b,f):
    for s,label in enumerate(stages,1):
     for v in range(VARIANTS):
      yield dict(id=f'{b}_{f}_{s:02}_{v:02}',biome=b,family=f,stage=s,label=label,variant=v,pivot='ground',url=f'{b}_{f}_{s:02}_{v:02}.glb')
if __name__=='__main__':
 import json
 from pathlib import Path
 Path(__file__).with_name('catalog.json').write_text(json.dumps(list(entries()),ensure_ascii=False,indent=2))
