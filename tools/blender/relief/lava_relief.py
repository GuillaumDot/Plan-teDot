"""PlanèteDot V9.4 · lave cohérente avec le relief (numpy seul, utilisé par bake_relief.py).

Règle du projet (Guillaume, 26/11/2026) : la lave suit le relief. Elle part de la lèvre du cratère (ou du sommet),
descend par la plus grande pente, donc par les ravines, ne remonte jamais, ne passe ni sur une crête ni par-dessus
un cône, s'élargit en descendant et s'arrête dans la plaine ou dans une cuvette.

Toutes les grilles sont carrées, cadrage d dans [-c, c]^2 (c = 1.25 : repère vH93, rayon 1 = pied du volcan).
Lignes = axe v, colonnes = axe u, dans le même sens que la hauteur donnée (le tracé ne dépend pas de l'orientation).
"""
import numpy as np


def flou(x, it=1):
    for _ in range(it):
        x = (4 * x + np.roll(x, 1, 0) + np.roll(x, -1, 0) + np.roll(x, 1, 1) + np.roll(x, -1, 1)) / 8
    return x


def relief_local(h, it=10):
    """> 0 sur les crêtes (plus haut que le voisinage), < 0 dans les ravines."""
    hs = flou(h, 2)
    return hs - flou(hs, it)


def ravines(h):
    """Masque des ravines (0..1) déduit du relief : les creux par rapport au voisinage."""
    d = relief_local(h)
    s = np.quantile(np.abs(d), .98) + 1e-9
    return np.clip(-d / s, 0, 1)


def remplir(h, eps=1e-6):
    """Comble les cuvettes (inondation par priorité, Barnes 2014) : de chaque point, un chemin descend jusqu'au bord.
    La lave qui tombe dans une cuvette la remplit puis déborde, comme en vrai."""
    import heapq
    S = h.shape[0]; f = h.astype(np.float64).copy(); vu = np.zeros(h.shape, bool); pq = []
    for i in range(S):
        for j in ((0, S - 1) if 0 < i < S - 1 else range(S)):
            vu[i, j] = True; heapq.heappush(pq, (f[i, j], i, j))
    V = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))
    while pq:
        z, i, j = heapq.heappop(pq)
        for di, dj in V:
            a, b = i + di, j + dj
            if 0 <= a < S and 0 <= b < S and not vu[a, b]:
                vu[a, b] = True; f[a, b] = max(f[a, b], z + eps); heapq.heappush(pq, (f[a, b], a, b))
    return f


def coulees(h, n=4, graine=7, cadrage=1.25):
    """Masque de lave (0..1) tracé sur la hauteur h : n coulées, de la lèvre vers le pied, par le plus bas voisin."""
    S = h.shape[0]; rng = np.random.default_rng(graine); hm = float(h.max()) or 1.
    R = max(S // 2, 64); dx = 2 * cadrage / S; dr = 2 * cadrage / R                    # routage sur une grille deux fois plus petite
    hs = flou(h / hm, 4); hr = hs.reshape(R, S // R, R, S // R).mean((1, 3)) if S % R == 0 else hs[::S // R, ::S // R][:R, :R]
    f = remplir(hr)
    V = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))
    m = np.zeros((S, S)); yy0, xx0 = np.mgrid[0:S, 0:S]
    ang = rng.uniform(0, 2 * np.pi) + np.arange(n) * 2 * np.pi / n + rng.uniform(-.4, .4, n)
    for k, an in enumerate(ang):
        rs = np.linspace(.02, .95 * cadrage, 240)
        ci = np.clip(((np.sin(an) * rs + cadrage) / dr).astype(int), 0, R - 1); cj = np.clip(((np.cos(an) * rs + cadrage) / dr).astype(int), 0, R - 1)
        i0 = int(np.argmax(hr[ci, cj])); r0 = rs[i0] + .04                              # départ : juste sous la lèvre (le plus haut du rayon)
        i, j = int((np.sin(an) * r0 + cadrage) / dr), int((np.cos(an) * r0 + cadrage) / dr)
        h0 = hr[i, j]; fin = h0 * (1 - [.8, 1.1, 1.1, .95][k % 4] * (.92 + .12 * rng.random()))   # une ou deux s'arrêtent à mi-pente
        pts = [(i, j)]
        for _ in range(4 * R):
            if not (0 < i < R - 1 and 0 < j < R - 1) or hr[i, j] < max(.006, fin): break   # arrivée dans la plaine
            best = None
            for di, dj in V:
                dz = (f[i, j] - f[i + di, j + dj]) / (1.4142 if di and dj else 1.)
                if best is None or dz > best[0]: best = (dz, i + di, j + dj)
            if best[0] <= 0: break
            i, j = best[1], best[2]; pts.append((i, j))
        P = np.array(pts, float)
        if len(P) > 5: P = np.array([P[max(0, q - 3):q + 4].mean(0) for q in range(len(P))])   # lisser le tracé
        L = 0.
        for q, (pi, pj) in enumerate(P):
            if q: L += np.hypot(pi - P[q - 1][0], pj - P[q - 1][1]) * dr
            cy, cx = (pi + .5) * dr / dx - .5, (pj + .5) * dr / dx - .5; w = max((.024 + .09 * L) / dx, 1.2); p = q / max(len(P) - 1, 1)
            a0, a1 = max(0, int(cy - 2 * w - 2)), min(S, int(cy + 2 * w + 3)); b0, b1 = max(0, int(cx - 2 * w - 2)), min(S, int(cx + 2 * w + 3))
            d2 = ((yy0[a0:a1, b0:b1] - cy) ** 2 + (xx0[a0:a1, b0:b1] - cx) ** 2) / (w * w)
            m[a0:a1, b0:b1] = np.maximum(m[a0:a1, b0:b1], np.exp(-d2 * 2.2) * (1 - .4 * p))
    m = flou(m, 2) * 1.2
    d = relief_local(h / hm); m *= flou(np.clip(1 - d / (np.quantile(np.abs(d), .9) + 1e-9) * .5, 0, 1), 3)   # pas sur les crêtes
    return np.clip(m, 0, 1)


def controle(h, lave):
    """(part de la lave sur les crêtes, part dans les ravines). La lave suit le relief si crêtes < 0,5 x ravines.
    Mesuré le 26/11 : volcan V9.4 première cuisson 0,25 / 0,29 (refusé : elle passait sur des crêtes), lave tracée 0,15 / 0,42."""
    d = relief_local(h / (float(h.max()) or 1.)); t = np.quantile(np.abs(d), .75)
    tot = float(lave.sum()) + 1e-9
    return float((lave * (d > t)).sum() / tot), float((lave * (d < -t)).sum() / tot)
