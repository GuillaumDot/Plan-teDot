// node assets/cosmic/natural-world-v22/demo.mjs [graine=7] [N=64] [apercu.ppm]
// Cuit un monde, affiche les mesures, et peut écrire un aperçu équirectangulaire des DONNÉES (pas le rendu du moteur) :
// en haut le monde naturel (biomes, rivières, lacs, routes, ponts, villes), en bas le front Dual Identity à 45 % (identité B en violet provisoire).
import { bakeWorld, BIOMES, cellOf, identityAt } from './world.mjs';
import { writeFileSync } from 'node:fs';
const seed = +(process.argv[2] ?? 7), N = +(process.argv[3] ?? 64), out = process.argv[4];
const w = bakeWorld({ seed, N });
console.log(JSON.stringify({ gen: w.gen, seed, N, ms: w.ms, ...w.stats, compSize: undefined, cities: w.cities.length, ports: w.cities.filter(c => c.port).length,
  riverCities: w.cities.filter(c => c.river).length, roads: w.roads.length, bridges: w.bridges.length, seaRoutes: w.seaRoutes.length, volcanoes: w.volcanoes.length }, null, 1));
if (out){
  const COL = { ocean: [18, 52, 96], ice: [235, 240, 246], tundra: [128, 124, 104], taiga: [34, 70, 48], temperate_forest: [40, 92, 38], grassland: [118, 140, 64],
    desert: [214, 178, 118], savanna: [168, 150, 76], rainforest: [16, 78, 30], alpine_rock: [120, 110, 100], wetland: [62, 98, 84] };
  const W = 512, Hh = 256, img = new Uint8Array(W * Hh * 2 * 3), F = w.fields, nb = BIOMES.length, road = new Set(), bridge = new Set(w.bridges.map(b => b.cell)), city = new Set(w.cities.map(c => c.cell));
  for (const r of w.roads) for (const c of r.cells) road.add(c);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++){
    const lon = (x + .5) / W * 2 * Math.PI - Math.PI, lat = Math.PI / 2 - (y + .5) / Hh * Math.PI, d = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
    const c = cellOf(d, N), hk = (dl, dp) => F.hKm[cellOf([Math.cos(lat + dp) * Math.sin(lon + dl), Math.sin(lat + dp), Math.cos(lat + dp) * Math.cos(lon + dl)], N)];
    let r = 0, g = 0, b = 0; BIOMES.forEach((k, i) => { const v = F.weights[c * nb + i]; r += v * COL[k][0]; g += v * COL[k][1]; b += v * COL[k][2]; });
    if (F.water[c] === 1){ const dp = Math.min(1, -F.hKm[c] / 4); r *= 1.3 - .6 * dp; g *= 1.3 - .6 * dp; b *= 1.3 - .5 * dp; }
    else { const sh = 1 + Math.max(-.35, Math.min(.35, (hk(-.03, 0) - hk(.03, 0) + hk(0, .03) - hk(0, -.03)) * .35)); r *= sh; g *= sh; b *= sh; }
    if (F.water[c] === 2){ r = 40; g = 110; b = 170; } else if (F.water[c] === 4){ r = 225; g = 222; b = 210; } else if (F.water[c] === 3){ r = 50; g = 120; b = 200; }
    if (road.has(c) && F.water[c] !== 3){ r = 95; g = 60; b = 40; } if (bridge.has(c)){ r = 255; g = 220; b = 0; } if (city.has(c)){ r = 230; g = 30; b = 40; }
    const q = (y * W + x) * 3; img[q] = Math.min(255, r); img[q + 1] = Math.min(255, g); img[q + 2] = Math.min(255, b);
    const k = identityAt(F.id[c], .45), q2 = ((y + Hh) * W + x) * 3, L = (img[q] + img[q + 1] + img[q + 2]) / 3;
    img[q2] = Math.min(255, img[q] * (1 - k) + (L * .45 + 70) * k); img[q2 + 1] = Math.min(255, img[q + 1] * (1 - k) + (L * .3 + 20) * k); img[q2 + 2] = Math.min(255, img[q + 2] * (1 - k) + (L * .5 + 110) * k);
  }
  writeFileSync(out, Buffer.concat([Buffer.from('P6\n' + W + ' ' + Hh * 2 + '\n255\n'), Buffer.from(img)]));
  console.log('aperçu : ' + out);
}
