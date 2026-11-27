// Natural World V2.2 : prototype autonome (Claude, 27/11/2026), pas encore branché au rendu.
// Base : V2.1 de ChatGPT (../natural-world-v21/world.mjs), dont l'API est conservée : worldSample(direction, seed) et audioInertia.
// Ajouts : bruit entier identique JS/GLSL, relief par couches, monde « cuit » sur une cube-sphère (vents, pluies orographiques,
// drainage, lacs, érosion fluviale, biomes continus, végétation, villes, routes, ponts, ports), front Dual Identity, chunks LOD.
// Lire README.md (comparaison, sources, branchement prévu, suite).
export const GEN = 22;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* 1. Bruit entier : mêmes opérations en GLSL ES 3.0 avec des uint (voir README), donc même graine = même monde sur tous les appareils. */
export function hash4(x, y, z, s){
  let h = Math.imul(x | 0, 0x8da6b343) ^ Math.imul(y | 0, 0xd8163841) ^ Math.imul(z | 0, 0xcb1ab31f) ^ Math.imul(s | 0, 0x165667b1);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const sm = t => t * t * (3 - 2 * t);
export function noise3(x, y, z, s){
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
  const a = hash4(i, j, k, s), b = hash4(i + 1, j, k, s), c = hash4(i, j + 1, k, s), d = hash4(i + 1, j + 1, k, s);
  const e = hash4(i, j, k + 1, s), f = hash4(i + 1, j, k + 1, s), g = hash4(i, j + 1, k + 1, s), h = hash4(i + 1, j + 1, k + 1, s);
  const p = a + (b - a) * u, q = c + (d - c) * u, r = e + (f - e) * u, t = g + (h - g) * u, m = p + (q - p) * v;
  return m + (r + (t - r) * v - m) * w;
}
export function fbm(x, y, z, s, oct){   // octaves tournées (matrice TRM du shader) : aucun alignement sur la grille du bruit
  let n = 0, a = .5, t = 0;
  for (let i = 0; i < oct; i++){ n += a * noise3(x, y, z, s + i * 7919); t += a; a *= .5;
    const X = -.8 * y - .6 * z, Y = .8 * x + .36 * y - .48 * z, Z = .6 * x - .48 * y + .64 * z; x = X * 2.03; y = Y * 2.03; z = Z * 2.03; }
  return n / t;
}

/* 2. Relief par couches (méthode inspirée de Minecraft, sur une sphère continue) : continentalité déformée,
   ceintures orogéniques le long de limites de « plaques » (arcs insulaires en mer), crêtes multifractales, âge du relief. */
export function elevation(p, seed, out){
  const s = seed | 0; let x = p[0] * 1.7, y = p[1] * 1.7, z = p[2] * 1.7;
  const wx = fbm(x, y, z, s + 101, 3) - .5, wy = fbm(x, y, z, s + 202, 3) - .5, wz = fbm(x, y, z, s + 303, 3) - .5;
  x += wx * 2.4; y += wy * 2.4; z += wz * 2.4;
  const cont = fbm(x, y, z, s + 1, 5), plate = fbm(x * .8, y * .8, z * .8, s + 404, 2), belt = Math.exp(-(((plate - .5) / .035) ** 2));
  const young = smooth(.6, .4, fbm(x * 1.2, y * 1.2, z * 1.2, s + 606, 2));
  let rid = 0, amp = .5, wgt = 1, rx = x * 3.1, ry = y * 3.1, rz = z * 3.1;
  for (let i = 0; i < 4; i++){ let n = 1 - Math.abs(noise3(rx, ry, rz, s + 505 + i) * 2 - 1); n *= n * wgt; wgt = clamp(n * 2); rid += n * amp; amp *= .5;
    const X = -.8 * ry - .6 * rz, Y = .8 * rx + .36 * ry - .48 * rz, Z = .6 * rx - .48 * ry + .64 * rz; rx = X * 2.1; ry = Y * 2.1; rz = Z * 2.1; }
  if (out){ out.belt = belt; out.young = young; }
  return cont + (belt * (.55 + .45 * young) + .12 * young) * rid * .3;
}

/* 3. Cube-sphère au format des cube maps WebGL (face f = TEXTURE_CUBE_MAP_POSITIVE_X + f, texel (i, j) = colonne i, ligne j) : envoi direct au GPU. */
export function faceDir(f, sc, tc, o = [0, 0, 0]){
  let x, y, z;
  switch (f){ case 0: x = 1; y = -tc; z = -sc; break; case 1: x = -1; y = -tc; z = sc; break; case 2: x = sc; y = 1; z = tc; break;
    case 3: x = sc; y = -1; z = -tc; break; case 4: x = sc; y = -tc; z = 1; break; default: x = -sc; y = -tc; z = -1; }
  const l = Math.hypot(x, y, z); o[0] = x / l; o[1] = y / l; o[2] = z / l; return o;
}
export function cellOf(d, N){
  const ax = Math.abs(d[0]), ay = Math.abs(d[1]), az = Math.abs(d[2]); let f, sc, tc, ma;
  if (ax >= ay && ax >= az){ ma = ax; if (d[0] > 0){ f = 0; sc = -d[2]; } else { f = 1; sc = d[2]; } tc = -d[1]; }
  else if (ay >= az){ ma = ay; sc = d[0]; if (d[1] > 0){ f = 2; tc = d[2]; } else { f = 3; tc = -d[2]; } }
  else { ma = az; tc = -d[1]; if (d[2] > 0){ f = 4; sc = d[0]; } else { f = 5; sc = -d[0]; } }
  const i = Math.min(N - 1, Math.max(0, Math.floor((sc / ma + 1) * .5 * N))), j = Math.min(N - 1, Math.max(0, Math.floor((tc / ma + 1) * .5 * N)));
  return f * N * N + j * N + i;
}
class Heap { constructor(n){ this.k = new Float64Array(n); this.v = new Int32Array(n); this.n = 0; }
  push(key, val){ const k = this.k, v = this.v; let i = this.n++; while (i > 0){ const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
  pop(){ const k = this.k, v = this.v, top = v[0], n = --this.n; if (n > 0){ const key = k[n], val = v[n]; let i = 0;
      for (;;){ let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= key) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = key; v[i] = val; } return top; } }

/* 4. Le monde cuit : une fois par graine et par version de générateur, dans un Worker, avec un cache borné. Un champ par cellule. */
export const BIOMES = ['ocean', 'ice', 'tundra', 'taiga', 'temperate_forest', 'grassland', 'desert', 'savanna', 'rainforest', 'alpine_rock', 'wetland'];
const BC = [[-20, 200, 9, 1.4], [-7, 320, 5, 1], [1, 550, 5, .7], [12, 1100, 6, .5], [12, 450, 8, .45], [21, 120, 12, .65], [25, 950, 5, .45], [26, 2600, 4, .45]];   // glace…forêt tropicale : °C, mm/an, σT, σ ln P (diagramme de Whittaker)
export function bakeWorld(opt = {}){
  const t0 = Date.now(), seed = opt.seed | 0, N = opt.N || 64, NN = N * N, C = 6 * NN, landFrac = opt.landFraction ?? .3, NBI = BIOMES.length;
  const P = new Float32Array(C * 3), SA = new Float32Array(C), BELT = new Float32Array(C), YNG = new Float32Array(C), H = new Float64Array(C), o = [0, 0, 0], tec = {};
  for (let f = 0; f < 6; f++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){ const c = f * NN + j * N + i, sc = 2 * (i + .5) / N - 1, tc = 2 * (j + .5) / N - 1;
    faceDir(f, sc, tc, o); P[c * 3] = o[0]; P[c * 3 + 1] = o[1]; P[c * 3 + 2] = o[2]; SA[c] = (4 / NN) * (1 + sc * sc + tc * tc) ** -1.5;   // angle solide réel de la cellule
    H[c] = elevation(o, seed, tec); BELT[c] = tec.belt; YNG[c] = tec.young; }
  const NB = new Int32Array(C * 8).fill(-1), ND = new Float32Array(C * 8), TV = new Float32Array(C * 24), OFF = [1, 0, -1, 0, 0, 1, 0, -1, 1, 1, 1, -1, -1, 1, -1, -1];
  for (let c = 0; c < C; c++){ const f = (c / NN) | 0, j = ((c % NN) / N) | 0, i = c % N, px = P[c * 3], py = P[c * 3 + 1], pz = P[c * 3 + 2];   // 8 voisins, aussi d'une face à l'autre
    for (let k = 0; k < 8; k++){ faceDir(f, 2 * (i + .5 + OFF[2 * k]) / N - 1, 2 * (j + .5 + OFF[2 * k + 1]) / N - 1, o); const b = cellOf(o, N); if (b === c) continue;
      const bx = P[b * 3] - px, by = P[b * 3 + 1] - py, bz = P[b * 3 + 2] - pz, dp = bx * px + by * py + bz * pz, tx = bx - dp * px, ty = by - dp * py, tz = bz - dp * pz, tl = Math.hypot(tx, ty, tz) || 1;
      NB[c * 8 + k] = b; ND[c * 8 + k] = Math.hypot(bx, by, bz); TV[c * 24 + k * 3] = tx / tl; TV[c * 24 + k * 3 + 1] = ty / tl; TV[c * 24 + k * 3 + 2] = tz / tl; } }
  const dc = Math.PI / (2 * N), meanA = 4 * Math.PI / C;
  // niveau de la mer choisi pour la part de terres voulue (Terre : 29 %), en surface réelle
  const byH = Array.from({ length: C }, (_, c) => c).sort((a, b) => H[a] - H[b]); let acc0 = 0, sea = H[byH[C - 1]];
  for (const c of byH){ acc0 += SA[c]; if (acc0 >= (1 - landFrac) * 4 * Math.PI){ sea = H[c]; break; } }
  const KM = 6.5 / Math.max(1e-9, H[byH[Math.floor(.999 * (C - 1))]] - sea), km = c => Math.max(0, H[c] - sea) * KM, wet = c => H[c] <= sea;
  const LAT = new Float32Array(C), TN = new Float32Array(C);
  for (let c = 0; c < C; c++){ LAT[c] = Math.asin(clamp(P[c * 3 + 1], -1, 1)); TN[c] = fbm(P[c * 3] * 3, P[c * 3 + 1] * 3, P[c * 3 + 2] * 3, seed + 707, 2) - .5; }
  const dist = (src, cost) => { const D = new Float64Array(C).fill(Infinity), hp = new Heap(C * 9);   // Dijkstra multi-sources sur la cube-sphère
    for (let c = 0; c < C; c++) if (src(c)){ D[c] = 0; hp.push(0, c); }
    while (hp.n){ const key = hp.k[0], c = hp.pop(); if (key > D[c]) continue;
      for (let k = 0; k < 8; k++){ const b = NB[c * 8 + k]; if (b < 0) continue; const nd = key + (cost ? cost(c, b, ND[c * 8 + k]) : ND[c * 8 + k]); if (nd < D[b]){ D[b] = nd; hp.push(nd, b); } } }
    return Float32Array.from(D); };   // calcul en double : en simple précision, l'arrondi faisait sauter des cellules
  // vents dominants : alizés, vents d'ouest, vents polaires (cellules de Hadley, Ferrel et polaire), déviés par un bruit lent
  const WD = new Float32Array(C * 3), UW = new Float32Array(C * 8);
  for (let c = 0; c < C; c++){ const px = P[c * 3], py = P[c * 3 + 1], pz = P[c * 3 + 2]; let ex = pz, ez = -px; const el = Math.hypot(ex, ez) || 1; ex /= el; ez /= el;
    const nx = py * ez, ny = pz * ex - px * ez, nz = -py * ex, a6 = Math.sin(6 * Math.abs(LAT[c])), u0 = -a6, v0 = -.35 * a6 * Math.sign(LAT[c]);   // nord = p × est
    const th = TN[c] * 1.6, cs = Math.cos(th), sn = Math.sin(th), u = u0 * cs - v0 * sn, v = u0 * sn + v0 * cs, wx = u * ex + v * nx, wy = v * ny, wz = u * ez + v * nz, wl = Math.hypot(wx, wy, wz);
    WD[c * 3] = wx; WD[c * 3 + 1] = wy; WD[c * 3 + 2] = wz; let s = 0;
    for (let k = 0; k < 8; k++){ if (NB[c * 8 + k] < 0) continue; const a = wl > .05 ? -(wx * TV[c * 24 + k * 3] + wy * TV[c * 24 + k * 3 + 1] + wz * TV[c * 24 + k * 3 + 2]) / wl : 0;
      const w = (a > 0 ? a * a : 0) + .06; UW[c * 8 + k] = w; s += w; }   // poids des voisins situés au vent (+ un peu de diffusion)
    for (let k = 0; k < 8; k++) UW[c * 8 + k] /= s || 1; }
  const T = new Float32Array(C), PR = new Float32Array(C);
  const climate = () => {
    const dOc = dist(wet);
    for (let c = 0; c < C; c++){ const s2 = Math.sin(LAT[c]) ** 2; T[c] = 27 - 45 * s2 ** 1.5 - 6.5 * km(c) - 8 * s2 * smooth(0, 14 * dc, dOc[c]) + TN[c] * 6; }   // latitude, 6,5 °C/km, continentalité
    // l'humidité vient de la mer avec le vent ; il pleut quand l'air monte ou se refroidit (Clausius-Clapeyron) : ombre pluviométrique derrière les montagnes
    const RB = new Float32Array(C), CAP = new Float32Array(C), QO = new Float32Array(C);
    for (let c = 0; c < C; c++){ let up = km(c); for (let k = 0; k < 8; k++){ const b = NB[c * 8 + k]; if (b >= 0) up -= UW[c * 8 + k] * km(b); }
      const ph = Math.abs(LAT[c]) * 57.29578, itcz = Math.exp(-((ph / 9) ** 2)), subs = Math.exp(-(((ph - 26) / 9) ** 2));   // pluies équatoriales, air descendant subtropical
      RB[c] = (.035 + .3 * Math.max(0, up)) * (1 + 2 * itcz) * (1 - .75 * subs) * (1 - clamp(-up * .6, 0, .7));
      CAP[c] = Math.min(1.2, Math.exp(.065 * (T[c] - 27))); QO[c] = clamp(.3 + .7 * (T[c] + 2) / 30, .05, 1); }
    let q = new Float32Array(C), q2 = new Float32Array(C);
    for (let it = 0, n = 3 * N; it < n; it++){
      for (let c = 0; c < C; c++){ if (wet(c)){ q2[c] = QO[c]; PR[c] = QO[c] * RB[c]; continue; }
        let qi = 0; for (let k = 0; k < 8; k++){ const b = NB[c * 8 + k]; if (b >= 0) qi += UW[c * 8 + k] * q[b]; }
        const p = Math.min(qi, Math.max(0, qi - CAP[c]) + qi * RB[c]); PR[c] = p; q2[c] = qi - p * .75; }   // 25 % de la pluie est réévaporée par le sol et les plantes
      const tq = q; q = q2; q2 = tq; }
    const ref = (.3 + .7 * 17 / 30) * .035; for (let c = 0; c < C; c++) PR[c] = Math.min(6000, 900 * PR[c] / ref);   // mm/an (côte tempérée ≈ 900 mm)
  };
  const flood = () => { const F = new Float64Array(C), rec = new Int32Array(C).fill(-1), ord = new Int32Array(C), seen = new Uint8Array(C), hp = new Heap(C); let m = 0;   // comblement des cuvettes (Barnes 2014)
    for (let c = 0; c < C; c++) if (wet(c)){ seen[c] = 1; F[c] = H[c]; hp.push(H[c], c); }
    if (!hp.n){ let lo = 0; for (let c = 1; c < C; c++) if (H[c] < H[lo]) lo = c; seen[lo] = 1; F[lo] = H[lo]; hp.push(H[lo], lo); }
    while (hp.n){ const c = hp.pop(); ord[m++] = c; for (let k = 0; k < 8; k++){ const b = NB[c * 8 + k]; if (b < 0 || seen[b]) continue; seen[b] = 1; F[b] = Math.max(H[b], F[c] + 1e-9); rec[b] = c; hp.push(F[b], b); } }
    return { F, rec, ord, m }; };
  const PET = c => clamp(45 * T[c] + 350, 0, 1600), runoff = c => wet(c) ? 0 : Math.max(.1 * PR[c], PR[c] - .7 * PET(c)) / 1000 * SA[c];
  const accumulate = fl => { const A = new Float64Array(C); for (let c = 0; c < C; c++) A[c] = runoff(c); for (let q = fl.m - 1; q >= 0; q--){ const c = fl.ord[q], r = fl.rec[c]; if (r >= 0) A[r] += A[c]; } return A; };
  const chord = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
  climate();
  const KE = opt.erosion ?? .12;   // érosion fluviale implicite (loi de puissance du courant, Braun et Willett 2013) : plus il pleut, plus les vallées se creusent
  for (let e = 0; e < 3 && KE > 0; e++){ const fl = flood(), A = accumulate(fl);
    for (let q = 0; q < fl.m; q++){ const c = fl.ord[q], r = fl.rec[c]; if (r < 0 || H[r] >= H[c]) continue; const F = KE * Math.sqrt(A[c]) / chord(c, r); H[c] = (H[c] + F * H[r]) / (1 + F); } }
  climate();
  const fl = flood(), A = accumulate(fl), WT = new Uint8Array(C), LD = new Float32Array(C), riverMin = (opt.riverCells ?? 40) * .4 * meanA;   // 0 terre, 1 mer, 2 lac, 3 rivière, 4 bassin fermé (sel)
  for (let c = 0; c < C; c++){ if (wet(c)){ WT[c] = 1; continue; } const d = (fl.F[c] - H[c]) * KM;
    if (d > .015){ LD[c] = d; WT[c] = A[c] / SA[c] >= PET(c) / 1000 ? 2 : 4; } else if (A[c] >= riverMin) WT[c] = 3; }
  const dRiv = dist(c => WT[c] === 3 || WT[c] === 2), dCoast = dist(wet), dWater = dist(c => WT[c] > 0 && WT[c] < 4), SL = new Float32Array(C);
  for (let c = 0; c < C; c++){ let g = 0; for (let k = 0; k < 8; k++){ const b = NB[c * 8 + k]; if (b >= 0) g = Math.max(g, Math.abs(km(b) - km(c))); } SL[c] = g; }   // pente : km de dénivelé par cellule
  // biomes continus (Whittaker : température × précipitations) et végétation (modèle de Miami, Lieth 1975)
  const WTS = new Float32Array(C * NBI), NPP = new Float32Array(C);
  for (let c = 0; c < C; c++){ const t = T[c], p = PR[c], lp = Math.log(Math.max(20, p)), w = WTS.subarray(c * NBI, c * NBI + NBI);
    if (WT[c] === 1){ const ic = smooth(-4, -10, t); w[0] = 1 - ic; w[1] = ic; continue; }   // banquise
    for (let b = 0; b < 8; b++){ const B = BC[b]; w[b + 1] = Math.exp(-(((t - B[0]) / B[2]) ** 2) - (((lp - Math.log(B[1])) / B[3]) ** 2)); }
    let s = 0; for (let b = 1; b < 9; b++) s += w[b]; for (let b = 1; b < 9; b++) w[b] /= s || 1;
    const rk = clamp(smooth(1.5, 3.2, km(c)) * smooth(6, -2, t) + smooth(.8, 1.6, SL[c]) * .4);   // roche au-dessus de la limite des arbres et sur les pentes fortes
    const wl = Math.min(1 - rk, smooth(700, 1500, p) * Math.exp(-SL[c] / .1) * Math.exp(-dRiv[c] / (1.5 * dc)) * .6);   // zones humides en plaine, le long des rivières
    for (let b = 1; b < 9; b++) w[b] *= 1 - rk - wl; w[9] = rk; w[10] = wl;
    if (WT[c] === 2){ w.fill(0); w[0] = 1; } else if (WT[c] === 4){ w.fill(0); w[6] = 1; }   // lac d'eau douce ; bassin fermé = désert de sel
    NPP[c] = WT[c] === 2 || WT[c] === 4 ? 0 : Math.min(3000 * (1 - Math.exp(-.000664 * p)), 3000 / (1 + Math.exp(1.315 - .119 * t))) * (1 - w[1] - w[9]); }
  const comp = new Int32Array(C).fill(-1), compSize = [];   // terres d'un seul tenant : continents et îles
  for (let c = 0; c < C; c++){ if (WT[c] === 1 || comp[c] >= 0) continue; const id = compSize.length, st = [c]; comp[c] = id; let n = 0;
    while (st.length){ const a = st.pop(); n++; for (let k = 0; k < 8; k++){ const b = NB[a * 8 + k]; if (b >= 0 && WT[b] !== 1 && comp[b] < 0){ comp[b] = id; st.push(b); } } } compSize.push(n); }
  const pick = (score, K, sep) => { const idx = []; for (let c = 0; c < C; c++) if (score[c] > .02) idx.push(c); idx.sort((a, b) => score[b] - score[a]); const out = [], cs = Math.cos(sep);
    for (const c of idx){ if (out.length >= K) break; let ok = true; for (const d of out) if (P[c * 3] * P[d * 3] + P[c * 3 + 1] * P[d * 3 + 1] + P[c * 3 + 2] * P[d * 3 + 2] > cs){ ok = false; break; } if (ok) out.push(c); } return out; };
  const VS = new Float32Array(C); for (let c = 0; c < C; c++) VS[c] = H[c] < sea - .03 ? 0 : BELT[c] * YNG[c] * .8 + .3 * smooth(.985, 1, hash4(c, seed, 3, 11));   // subduction + points chauds
  const volcanoes = pick(VS, 8, 9 * dc), dVolc = dist(c => volcanoes.includes(c));
  // civilisation : aptitude (pente douce, eau proche, climat doux, sol fertile), villes espacées, routes au moindre coût, ponts, ports
  const SU = new Float32Array(C);
  for (let c = 0; c < C; c++){ if (WT[c] === 1 || WT[c] === 2 || WT[c] === 4) continue; const w = WTS.subarray(c * NBI, c * NBI + NBI);
    SU[c] = Math.exp(-SL[c] / .35) * Math.exp(-dWater[c] / (2.5 * dc)) * Math.exp(-(((T[c] - 16) / 11) ** 2)) * (.2 + .8 * clamp(NPP[c] / 1800)) * (1 - w[1]) * (1 - .7 * w[9]) * (dVolc[c] < 1.5 * dc ? .3 : 1) * (.25 + .75 * smooth(15, 300, compSize[comp[c]])); }   // les civilisations naissent surtout sur les continents
  const cities = pick(SU, opt.cities ?? 16, (opt.citySpacing ?? 7) * dc).map(c => ({ cell: c, dir: [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]], suit: +SU[c].toFixed(3),
    port: dCoast[c] <= 1.6 * dc, river: dRiv[c] <= 1.6 * dc, tempC: +T[c].toFixed(1), precipMm: Math.round(PR[c]) }));
  const route = (s0, s1) => { const D = new Float64Array(C).fill(Infinity), PV = new Int32Array(C).fill(-1), hp = new Heap(C * 9); D[s0] = 0; hp.push(0, s0);
    while (hp.n){ const key = hp.k[0], c = hp.pop(); if (key > D[c]) continue; if (c === s1) break;
      for (let k = 0; k < 8; k++){ const b = NB[c * 8 + k]; if (b < 0 || WT[b] === 1) continue; const d = ND[c * 8 + k], g = Math.abs(km(b) - km(c)) / (d / dc);
        const nd = key + d * (1 + 10 * g + (WT[b] === 2 ? 20 : 0) + (WT[b] === 3 ? 3 : 0)); if (nd < D[b]){ D[b] = nd; PV[b] = c; hp.push(nd, b); } } }
    if (!Number.isFinite(D[s1])) return null; const path = []; for (let c = s1; c >= 0; c = PV[c]) path.push(c); return path.reverse(); };
  const roads = [], bridges = [], seaRoutes = [], inT = new Uint8Array(cities.length); if (cities.length) inT[0] = 1;
  for (let e = 1; e < cities.length; e++){ let ba = -1, bb = -1, bd = -2;   // arbre couvrant minimal (Prim) entre les villes
    for (let a = 0; a < cities.length; a++) if (inT[a]) for (let b = 0; b < cities.length; b++) if (!inT[b]){ const A1 = cities[a].dir, B1 = cities[b].dir, d = A1[0] * B1[0] + A1[1] * B1[1] + A1[2] * B1[2] - (comp[cities[a].cell] === comp[cities[b].cell] ? 0 : 2); if (d > bd){ bd = d; ba = a; bb = b; } }
    inT[bb] = 1; const path = route(cities[ba].cell, cities[bb].cell);
    if (path){ roads.push({ from: ba, to: bb, cells: path }); for (let q = 1; q < path.length; q++) if (WT[path[q]] === 3 && WT[path[q - 1]] !== 3) bridges.push({ cell: path[q], from: ba, to: bb, flow: A[path[q]] }); }
    else if (cities[ba].port && cities[bb].port) seaRoutes.push({ from: ba, to: bb }); }
  // Dual Identity : un front part d'un pôle déterministe, avance vite sur la mer, les plaines et les vallées, lentement sur les montagnes
  // (frontières naturelles). ID = part de la surface déjà passée (0…1) : progress 0→1 fait le morphing de toute la planète sans rien recalculer.
  const pole = cellOf([hash4(seed, 1, 2, 77) * 2 - 1, hash4(seed, 3, 4, 77) * 2 - 1, hash4(seed, 5, 6, 77) * 2 - 1], N);
  const AR = dist(c => c === pole, (a, b, d) => d * (1 + 6 * Math.abs(km(b) - km(a)) / (d / dc)) * (WT[b] === 1 ? .55 : 1) * (WT[b] === 3 ? .6 : 1) * (.75 + .5 * (TN[b] + .5)));
  const ID = new Float32Array(C); let acc1 = 0; for (const c of Array.from({ length: C }, (_, c) => c).sort((a, b) => AR[a] - AR[b])){ acc1 += SA[c]; ID[c] = acc1 / (4 * Math.PI); }
  let hMin = Infinity, hMax = -Infinity; for (let c = 0; c < C; c++){ hMin = Math.min(hMin, H[c]); hMax = Math.max(hMax, H[c]); }
  const elev01 = new Float32Array(C), hKm = new Float32Array(C); for (let c = 0; c < C; c++){ elev01[c] = (H[c] - hMin) / (hMax - hMin); hKm[c] = (H[c] - sea) * KM; }
  let land = 0, maxFlow = 0; const share = new Float64Array(NBI), cnt = [0, 0, 0, 0, 0];
  for (let c = 0; c < C; c++){ cnt[WT[c]]++; if (WT[c] !== 1){ land += SA[c]; maxFlow = Math.max(maxFlow, A[c]); } let bk = 0; for (let b = 1; b < NBI; b++) if (WTS[c * NBI + b] > WTS[c * NBI + bk]) bk = b; share[bk] += SA[c]; }
  const stats = { landShare: +(land / (4 * Math.PI)).toFixed(3), riverCells: cnt[3], lakeCells: cnt[2], saltFlatCells: cnt[4], landmasses: compSize.length, islands: compSize.filter(n => n < 40).length,
    biomeShare: Object.fromEntries(BIOMES.map((b, k) => [b, +(share[k] / (4 * Math.PI)).toFixed(3)])), maxFlow, compSize,
    tempC: [Math.min(...T).toFixed(1), Math.max(...T).toFixed(1)], precipMm: [Math.round(Math.min(...PR)), Math.round(Math.max(...PR))] };
  return { gen: GEN, seed, N, cells: C, sea, kmScale: KM, cellArea: meanA, ms: Date.now() - t0,
    fields: { dir: P, area: SA, h: Float32Array.from(H), elev01, hKm, T, P: PR, wind: WD, acc: Float32Array.from(A), water: WT, lakeDepth: LD, npp: NPP, suit: SU, id: ID, weights: WTS, slope: SL, comp, dVolc },
    cities, roads, bridges, seaRoutes, volcanoes, stats };
}

/* 5. Sorties pour le moteur. */
export function packCubeMaps(w){   // 2 cube maps RGBA8 ; face f = octets [f·N²·4, (f+1)·N²·4[
  const C = w.cells, F = w.fields, a = new Uint8Array(C * 4), b = new Uint8Array(C * 4), fm = Math.log1p(w.stats.maxFlow / w.cellArea);
  for (let c = 0; c < C; c++){ a[c * 4] = F.elev01[c] * 255; a[c * 4 + 1] = clamp((F.T[c] + 40) / 75) * 255; a[c * 4 + 2] = clamp(Math.log1p(F.P[c]) / Math.log1p(6000)) * 255; a[c * 4 + 3] = F.id[c] * 255;
    b[c * 4] = clamp(Math.log1p(F.acc[c] / w.cellArea) / fm) * 255; b[c * 4 + 1] = F.water[c] * 50; b[c * 4 + 2] = clamp(F.npp[c] / 3000) * 255; b[c * 4 + 3] = clamp(F.suit[c]) * 255; }
  return { climate: a, water: b, faceBytes: w.N * w.N * 4 };   // climate : altitude, °C, pluie, front d'identité ; water : débit, type d'eau, végétation, aptitude
}
export const identityAt = (arrival, progress, width = .04) => 1 - smooth(progress - width, progress + width, arrival);   // 1 = identité B
export function v19Biome(w, c){   // tuiles V1.9 : alpine, desert, volcanic, tropical, polar, island (+ temperate, sans ressource pour l'instant)
  const F = w.fields, n = BIOMES.length, x = k => F.weights[c * n + k];
  if (F.water[c] === 1 || F.water[c] === 2) return 'water'; if (F.dVolc[c] < 1.5 * Math.PI / (2 * w.N)) return 'volcanic';
  if (w.stats.compSize[F.comp[c]] < 40 && F.T[c] > 12) return 'island';
  const s = { polar: x(1) + x(2) * .6, alpine: x(9) + x(2) * .4 + x(3) * .3, desert: x(6) + x(5) * .3, tropical: x(8) + x(7), temperate: x(4) + x(5) * .7 + x(3) * .7 + x(10) };
  return Object.keys(s).reduce((a, b) => s[a] >= s[b] ? a : b);
}
const CACHE = new Map();
export function worldSample(direction, seed = 1, world){   // API de la V2.1 ; sans monde fourni, cuit une version N = 32 mise en cache (cohérence avant vitesse)
  const l = Math.hypot(direction[0], direction[1], direction[2]); if (!Number.isFinite(l) || l === 0) throw new RangeError('Invalid direction');
  if (!world){ world = CACHE.get(seed); if (!world){ world = bakeWorld({ seed, N: 32 }); if (CACHE.size >= 4) CACHE.delete(CACHE.keys().next().value); CACHE.set(seed, world); } }
  const c = cellOf([direction[0] / l, direction[1] / l, direction[2] / l], world.N), F = world.fields, n = BIOMES.length, weights = {};
  BIOMES.forEach((b, k) => { weights[b] = F.weights[c * n + k]; });
  return { elevation: F.elev01[c], temperature: clamp((F.T[c] + 30) / 60), humidity: clamp(Math.log1p(F.P[c]) / Math.log1p(4000)), weights, identity: identityAt(F.id[c], .5),
    tempC: F.T[c], precipMm: F.P[c], altitudeKm: F.hKm[c], water: F.water[c], flow: F.acc[c], npp: F.npp[c], suitability: F.suit[c], cell: c };
}

/* 6. Musique : lissage borné. La musique module vagues, lumière et particules, jamais le terrain de façon permanente. */
export function audioInertia(previous, target, dt, tau = .8){ return clamp(previous + (clamp(target) - previous) * (1 - Math.exp(-Math.max(0, dt) / Math.max(.01, tau)))); }
export function audioEnvelope(previous, target, dt, attack = .06, release = .8){ return audioInertia(previous, target, dt, target > previous ? attack : release); }   // attaque rapide, retombée lente

/* 7. Chunks cube-sphère pour les vues rapprochées : adresses stables, sommets de bord identiques au bit près entre chunks voisins,
   entre niveaux et entre faces (n puissance de 2), cibles de géomorphose pour passer d'un niveau à l'autre sans saut. */
export const chunkKey = (face, level, i, j) => face + '/' + level + '/' + i + '/' + j;
export function chunkVertices(face, level, i, j, n, seed){   // (n+1)² sommets : direction x, y, z + altitude brute
  const LM = 20, M = 2 ** (LM - 1) * n, sh = 2 ** (LM - level), out = new Float32Array((n + 1) * (n + 1) * 4), o = [0, 0, 0];
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++){ const sc = -1 + (i * n + x) * sh / M, tc = -1 + (j * n + y) * sh / M, q = ((y * (n + 1)) + x) * 4;
    faceDir(face, sc, tc, o); out[q] = o[0]; out[q + 1] = o[1]; out[q + 2] = o[2]; out[q + 3] = elevation(o, seed); }
  return out;
}
export function morphTargets(v, n){   // altitude du niveau parent à chaque sommet ; le shader de sommets mélange les deux selon la distance
  const W = n + 1, m = new Float32Array(W * W), at = (x, y) => v[(y * W + x) * 4 + 3];
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++){ const x0 = x & ~1, y0 = y & ~1, x1 = Math.min(n, x0 + 2), y1 = Math.min(n, y0 + 2), fx = (x - x0) / 2, fy = (y - y0) / 2;
    m[y * W + x] = (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy; }
  return m;
}
