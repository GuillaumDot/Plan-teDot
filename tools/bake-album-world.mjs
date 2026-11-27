import { writeFile } from 'node:fs/promises';
import { bakeWorld, cellOf } from '../assets/cosmic/natural-world-v22/world.mjs';

// Album planet seed 7.7, encoded in tenths so its decimal part remains significant.
const world = bakeWorld({seed:77, N:64});
const {elev01, npp, acc, id} = world.fields;
const width = 256, height = 128;
const pixels = new Uint8Array(width * height * 4);
const maximumFlow = Math.log1p(world.stats.maxFlow / world.cellArea);
for(let y=0;y<height;y++){
  const latitude = ((y+.5)/height-.5)*Math.PI;
  for(let x=0;x<width;x++){
    const lon=((x+.5)/width-.5)*2*Math.PI;
    const cell=cellOf([Math.cos(latitude)*Math.cos(lon),Math.sin(latitude),Math.cos(latitude)*Math.sin(lon)],world.N);
    const channels=[elev01[cell],npp[cell]/3000,Math.log1p(acc[cell]/world.cellArea)/maximumFlow,id[cell]];
    pixels.set(channels.map(v=>Math.round(255*Math.max(0,Math.min(1,v)))),4*(y*width+x));
  }
}
await writeFile(new URL('../assets/cosmic/natural-world-v22/album.rgba',import.meta.url),pixels);
