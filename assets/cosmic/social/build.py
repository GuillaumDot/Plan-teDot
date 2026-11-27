from PIL import Image,ImageSequence
from pathlib import Path
import json,shutil
root=Path(__file__).parent; out=root/'assets'; data=[]
for id,src,msg in [('hiphop','16_frame_spritesheet_4_rows_4_columns_on_a_tr.png','Ça me fait danser !'),('salsa','a_4x4_sprite_sheet_image_on_transparent_background.png','Quel rythme !'),('groove','a_clean_transparent_background_composite_image_a.png','Quel groove !')]:
 p=root.parent/src; im=Image.open(p); frames=[]
 for f in ImageSequence.Iterator(im):
  a=f.convert('RGBA');a.thumbnail((192,192)); b=Image.new('RGBA',(192,192));b.alpha_composite(a,((192-a.width)//2,192-a.height));frames.append(b)
 atlas=Image.new('RGBA',(768,768))
 for i,f in enumerate(frames):atlas.paste(f,((i%4)*192,(i//4)*192))
 atlas.save(out/f'{id}-atlas.png',optimize=True);frames[0].save(out/f'{id}.png');frames[0].save(out/f'{id}.webp',save_all=True,append_images=frames[1:],duration=100,loop=0,quality=82,method=4);shutil.copyfile(p,out/f'{id}.gif')
 data.append(dict(id=id,message=msg,atlas=f'assets/{id}-atlas.png',gif=f'assets/{id}.gif',webp=f'assets/{id}.webp',poster=f'assets/{id}.png',frames=16,fps=10,columns=4,rows=4,cell=192))
(root/'manifest.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
