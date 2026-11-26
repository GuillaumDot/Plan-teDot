"""Champ de hauteur d'essai pour un stratovolcan (repère vH93 : rayon 1 = pied du volcan).
Cadrage d dans [-1.25, 1.25]^2, lignes de bas en haut (comme les pixels Blender).
Sortie npz : h (hauteur en unités d), lava, ash, gully (0..1)."""
import numpy as np, sys, time

def hash2(ix, iy, seed):
    h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)

def vnoise(px, py, seed=0):
    ix = np.floor(px).astype(np.int64); iy = np.floor(py).astype(np.int64)
    fx = px - ix; fy = py - iy
    ux = fx * fx * (3 - 2 * fx); uy = fy * fy * (3 - 2 * fy)
    a = hash2(ix, iy, seed); b = hash2(ix + 1, iy, seed); c = hash2(ix, iy + 1, seed); d = hash2(ix + 1, iy + 1, seed)
    return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy

def fbm(px, py, oct=5, seed=0, lac=2.03, gain=.5):
    s = 0.; amp = 1.; norm = 0.
    for k in range(oct):
        s = s + amp * vnoise(px, py, seed + k * 17); norm += amp
        px = px * lac + 3.1; py = py * lac - 1.7; amp *= gain
    return s / norm

def grid(N):
    x = (np.arange(N) + .5) / N * 2.5 - 1.25
    return np.meshgrid(x, x)   # X[col], Y[row] : ligne 0 = bas

def smooth(a, it=1):
    for _ in range(it):
        a = (4 * a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 8
    return a

def base_cone(X, Y, rc, seed):
    r = np.hypot(X, Y); a = np.arctan2(Y, X)
    # contour un peu irrégulier
    rw = r * (1 + (fbm(np.cos(a) * 1.3 + 7, np.sin(a) * 1.3 + 3, 3, seed + 5) - .5) * .16 * np.clip(r / .4, 0, 1))
    foot, H = 1.05, .72
    rc = rc * (1 + (fbm(np.cos(a) * 2 + 4, np.sin(a) * 2 + 8, 3, seed + 3) - .5) * .35)
    t = np.clip((foot - rw) / (foot - rc), 0, 1)
    cone = H * t ** 1.85 + .09 * np.clip(1 - rw / 1.2, 0, 1) ** 2          # profil concave + large socle
    rim = H + .035 * np.exp(-((r - rc) / .022) ** 2)
    bowl = H - .5 * H * np.clip(1 - (r / rc) ** 2, 0, 1) ** .8                          # cratère
    h = np.where(r < rc, np.minimum(bowl, rim), cone + .035 * np.exp(-((r - rc) / .022) ** 2))
    h = h + (fbm(X * 5 + 11, Y * 5 + 5, 4, seed + 9) - .5) * .06 * np.clip((r - rc) / .15, 0, 1)
    h = h + (fbm(np.cos(a) * 9 + 2, np.sin(a) * 9 + 6 + r * 3, 3, seed + 13) - .5) * .03 * np.clip((r - rc) / .15, 0, 1)
    return h, r

def erode(h, r, rc, iters, K, seed):
    N = h.shape[0]; dx = 2.5 / N
    offs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    dist = np.array([np.hypot(i, j) * dx for i, j in offs])
    act = np.clip((r - rc - .005) / .06, 0, 1) * np.clip((1.18 - r) / .25, 0, 1)
    idx = np.arange(N * N).reshape(N, N)
    A = None
    for it in range(iters):
        nb = np.stack([np.roll(np.roll(h, -i, 0), -j, 1) for i, j in offs])
        sl = (h[None] - nb) / dist[:, None, None]
        k = np.argmax(sl, 0); smax = np.take_along_axis(sl, k[None], 0)[0]
        di = np.array([o[0] for o in offs])[k]; dj = np.array([o[1] for o in offs])[k]
        ri = (np.arange(N)[:, None] + di) % N; rj = (np.arange(N)[None, :] + dj) % N
        recv = np.where(smax > 0, ri * N + rj, idx).ravel()
        order = np.argsort(-h.ravel(), kind='stable')
        A = np.ones(N * N)
        rv = recv
        for i in order:            # accumulation des écoulements (D8)
            j = rv[i]
            if j != i: A[j] += A[i]
        A2 = A.reshape(N, N) * dx * dx
        E = K * np.sqrt(A2) * np.clip(smax, 0, 3) * act
        h = h - E
        lap = np.roll(h, 1, 0) + np.roll(h, -1, 0) + np.roll(h, 1, 1) + np.roll(h, -1, 1) - 4 * h
        h = h + .18 * lap * (.3 + .7 * act)
    return h, A.reshape(N, N), recv.reshape(N, N)

def upsample(a, f):
    N = a.shape[0]; M = N * f
    t = (np.arange(M) + .5) / f - .5
    i0 = np.clip(np.floor(t).astype(int), 0, N - 1); i1 = np.clip(i0 + 1, 0, N - 1); w = t - np.floor(t)
    w = w * w * (3 - 2 * w)
    a1 = a[i0] * (1 - w)[:, None] + a[i1] * w[:, None]
    return a1[:, i0] * (1 - w)[None] + a1[:, i1] * w[None]

def lava_paths(h, recv, r, rc, seed, n=4):
    N = h.shape[0]; rng = np.random.default_rng(seed)
    X, Y = grid(N); m = np.zeros((N, N)); dx = 2.5 / N
    hs = smooth(h, 3); gy, gx = np.gradient(hs, dx); wob = fbm(X * 7 + 5, Y * 7 + 2, 3, seed + 41) - .5
    angs = rng.uniform(0, 2 * np.pi) + np.arange(n) * 2 * np.pi / n + rng.uniform(-.5, .5, n)
    for k, an in enumerate(angs):
        px, py = np.cos(an) * (rc * 1.2 + .03), np.sin(an) * (rc * 1.2 + .03); L = [.62, .88, 1.0, .75][k % 4]
        for step in range(3000):
            rad = np.hypot(px, py)
            if rad > L: break
            ci = int((py + 1.25) / dx); cj = int((px + 1.25) / dx)
            if not (0 <= ci < N and 0 <= cj < N): break
            g = np.array([gx[ci, cj], gy[ci, cj]]); gl = np.hypot(*g)
            radial = np.array([px, py]) / max(rad, 1e-6)
            d = -g / gl if gl > 1e-6 else radial
            d = d * .8 + radial * .2; d /= np.hypot(*d)
            if d @ radial < .2: d = radial
            px += d[0] * dx * .7; py += d[1] * dx * .7
            w = (.022 + .1 * max(rad - rc, 0)) * (.75 + .6 * wob[min(ci, N - 1), min(cj, N - 1)] + .25) / dx
            i0, i1 = max(0, int(ci - w - 2)), min(N, int(ci + w + 3)); j0, j1 = max(0, int(cj - w - 2)), min(N, int(cj + w + 3))
            yy, xx = np.mgrid[i0:i1, j0:j1]
            d2 = ((yy - ci) ** 2 + (xx - cj) ** 2) / max(w * w, 1)
            m[i0:i1, j0:j1] = np.maximum(m[i0:i1, j0:j1], np.exp(-d2 * 2.2) * (1 - .5 * (rad - rc) / max(L - rc, .01)))
    return np.clip(smooth(m, 2) * 1.2, 0, 1)

def main(out, N=1024, seed=7, rc=.15):
    t0 = time.time()
    Ne = N // 4
    X, Y = grid(Ne)
    h, r = base_cone(X, Y, rc, seed)
    h, A, recv = erode(h, r, rc, iters=int(sys.argv[2]) if len(sys.argv) > 2 else 24, K=float(sys.argv[3]) if len(sys.argv) > 3 else .12, seed=seed)
    print('érosion', round(time.time() - t0, 1), 's')
    # passage à la pleine résolution + détail fin
    h = smooth(h, 1)
    h = upsample(h, 2); X2, Y2 = grid(Ne * 2); r2 = np.hypot(X2, Y2)
    h, A, recv = erode(h, r2, rc, iters=4, K=.07, seed=seed)
    print('érosion fine', round(time.time() - t0, 1), 's')
    h = upsample(smooth(h, 1), N // (Ne * 2)); A = upsample(A, N // (Ne * 2))
    X, Y = grid(N); r = np.hypot(X, Y)
    h = h + (fbm(X * 40 + 3, Y * 40 + 9, 4, seed + 21) - .5) * .004 * np.clip((r - rc) / .1, 0, 1) * np.clip((1.2 - r) / .2, 0, 1)
    h = h * np.clip((1.22 - r) / .12, 0, 1) ** 2      # hauteur nulle au bord du cadre
    h = np.maximum(h, 0)
    # masques
    lg = np.log1p(A * (N / 2.5) ** 2 / 16)
    gully = np.clip((lg - 2.2) / 3.5, 0, 1) * np.clip((r - rc) / .1, 0, 1) * np.clip((1.15 - r) / .2, 0, 1)
    recv_f = None
    lava = upsample(lava_paths(h[::2, ::2], recv_f, r[::2, ::2], rc, seed), 2)
    ash = np.clip(1 - (r - rc) / .45, 0, 1) ** 1.5 * (.6 + .4 * fbm(X * 9 + 1, Y * 9 + 4, 4, seed + 33))
    ash = np.maximum(ash, (r < rc) * .7)
    np.savez_compressed(out, h=h.astype(np.float32), lava=lava.astype(np.float32), ash=ash.astype(np.float32), gully=gully.astype(np.float32), rc=rc)
    print('ok', out, 'hmax', float(h.max()), 'durée', round(time.time() - t0, 1), 's')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'volcan.npz')
