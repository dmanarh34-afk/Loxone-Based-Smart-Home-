/* =====================================================================
   WALK-IN CLOSET (second floor)
   A U-shaped fitted closet modelled from the reference render "Гарбероб.png" (light oak carcasses,
   hanging rails with clothes, folded stacks, white storage boxes, drawer banks, a mirror niche with a
   drawer bench, ceiling spots, dark marble floor). Built from boxes at start-up; the oak and dark-marble
   textures are the ones from the reference scene (textures/closet/). Loaded after the main script and
   shares its globals (THREE, floorGroups, LEVEL, CEIL, worldUV, carEnv). Entry point: closetInit() (window.onload).
   Coordinates are world metres: x east, z south; the closet opens to the west.
===================================================================== */
const CLOSET = {
    x0: 4.55, x1: 8.66,          // open (west) end .. east wall
    zN: -7.05, zS: -2.82,        // north / south wall faces
    H: 2.55, D: 0.58, T: 0.022   // cabinet height, depth, board thickness
};

function closetInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.F2) return;
    const C = CLOSET, g = new THREE.Group(); g.name = 'walk-in closet';
    g.position.y = LEVEL.F2 + 0.012;
    const ceilY = CEIL.F2 - LEVEL.F2 - 0.04;
    let seed = 20210612; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];

    // ---- materials (textures swap in when loaded; plain colours stay if they fail)
    const TL = new THREE.TextureLoader();
    const tex = (file, cb) => TL.load('textures/closet/' + file, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; cb(t); }, undefined, () => console.warn('closet texture failed:', file));
    const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
    const oak = std(0xe2c79d, { roughness: 0.6 }), oakBack = std(0xcdb088, { roughness: 0.7 });
    tex('oak.jpg', t => { oak.map = t; oak.color.setHex(0xffffff); oak.needsUpdate = true; const t2 = t.clone(); t2.needsUpdate = true; oakBack.map = t2; oakBack.color.setHex(0xd8c4a4); oakBack.needsUpdate = true; });
    const floorMat = std(0x1d1e21, { roughness: 0.28, metalness: 0.15 });
    tex('marble_dark.jpg', t => { const f = t.clone(); f.needsUpdate = true; f.repeat.set((C.x1 - C.x0 + 0.6) / 1.1, (C.zS - C.zN) / 1.1); floorMat.map = f; floorMat.color.setHex(0xffffff); floorMat.needsUpdate = true; });
    const metal = std(0x2a2c30, { metalness: 0.7, roughness: 0.35 });
    const chrome = std(0xe5e9ee, { metalness: 1, roughness: 0.08 });
    const white = std(0xf1f0ec, { roughness: 0.85 }), whiteLid = std(0xe7e5df, { roughness: 0.85 });
    const kraft = std(0xb88a52, { roughness: 0.9 });
    const molding = std(0xd6cbbc, { roughness: 0.85 });
    const mirror = std(0xdde5ec, { metalness: 1, roughness: 0.04, envMap: typeof carEnv === 'function' ? carEnv() : null, envMapIntensity: 1.0 });
    const led = std(0xfff0d0, { emissive: 0xffe2b0, emissiveIntensity: 1.3 });
    const lens = std(0xfff6e0, { emissive: 0xffe9bf, emissiveIntensity: 1.6 });
    const pouf = std(0xd9d0c2, { roughness: 0.95 });
    const fabrics = [0xe9e3d6, 0xf4f1ea, 0x9aa0a6, 0x6b6f75, 0x33363b, 0xb7a38a, 0xc9a27e, 0x8a2f3a, 0xe4a9b0, 0x3a4a6a, 0xc7b9a5, 0xd8d2c6].map(c => std(c, { roughness: 0.95 }));
    const stackFab = [0x9ea3a8, 0xb7babe, 0xd9d9d6, 0x8b8f94, 0xc8c3b9].map(c => std(c, { roughness: 0.98 }));
    const shoeMat = [0x2b2220, 0x7c2d2d, 0x3b2f2a, 0x1c1c1e, 0xa4553b].map(c => std(c, { roughness: 0.5 }));
    const cache = new Map();
    const BG = (w, h, d) => { const k = w.toFixed(3) + h.toFixed(3) + d.toFixed(3); let x = cache.get(k); if (!x) { x = worldUV(new THREE.BoxGeometry(w, h, d), 0.9); cache.set(k, x); } return x; };
    const cb = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(BG(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; };

    // ---- a "run" is a stretch of cabinetry along a wall; local coords u (along), v (out from the wall), y (up)
    const Run = (ox, oz, ux, uz, vx, vz) => ({
        P(u0, u1, v0, v1, y0, y1, mat) {
            const du = u1 - u0, dv = v1 - v0, um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
            const w = Math.abs(ux) * du + Math.abs(vx) * dv, d = Math.abs(uz) * du + Math.abs(vz) * dv;
            return cb(w, y1 - y0, d, mat, ox + ux * um + vx * vm, (y0 + y1) / 2, oz + uz * um + vz * vm);
        },
        C(u0, u1, v, y, r, mat) { // horizontal rod along u at depth v, height y
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, u1 - u0, 8), mat);
            const um = (u0 + u1) / 2;
            m.position.set(ox + ux * um + vx * v, y, oz + uz * um + vz * v);
            m.rotation.z = ux ? Math.PI / 2 : 0; m.rotation.x = uz ? Math.PI / 2 : 0; g.add(m); return m;
        }
    });
    const T = C.T, D = C.D, H = C.H;

    // pieces that go inside a bay
    const shelfBoard = (R, u0, u1, y) => R.P(u0 + T, u1 - T, 0.01, D - 0.01, y, y + T, oak);
    const stack = (R, uc, v, y, wU, wV, layers) => { let yy = y; for (let i = 0; i < layers; i++) { const h = 0.045 + rnd() * 0.02; R.P(uc - wU / 2 + (rnd() - 0.5) * 0.02, uc + wU / 2, v - wV / 2, v + wV / 2, yy, yy + h, pick(stackFab)); yy += h; } return yy; };
    const storageBox = (R, uc, v, y, wU, wV, hh, kraftBox) => { R.P(uc - wU / 2, uc + wU / 2, v - wV / 2, v + wV / 2, y, y + hh - 0.02, kraftBox ? kraft : white); R.P(uc - wU / 2 - 0.006, uc + wU / 2 + 0.006, v - wV / 2 - 0.006, v + wV / 2 + 0.006, y + hh - 0.02, y + hh, kraftBox ? kraft : whiteLid); };
    const garment = (R, u, rodY, len, wV) => {
        const m = pick(fabrics), th = 0.035 + rnd() * 0.02;
        R.P(u - th / 2, u + th / 2, D * 0.5 - wV / 2, D * 0.5 + wV / 2, rodY - len, rodY - 0.05, m);          // body
        R.P(u - 0.006, u + 0.006, D * 0.5 - 0.22, D * 0.5 + 0.22, rodY - 0.05, rodY - 0.035, oakBack);        // hanger bar
        if (rnd() < 0.3) R.P(u - th / 2 - 0.002, u + th / 2 + 0.002, D * 0.5 - wV / 2, D * 0.5 + wV / 2, rodY - len, rodY - len + 0.045, pick(fabrics)); // hem / trouser cuff band
    };
    const hangRail = (R, u0, u1, rodY, lenMin, lenMax, wV) => {
        R.C(u0 + T, u1 - T, D * 0.5, rodY, 0.012, metal);
        for (let u = u0 + T + 0.045; u < u1 - T - 0.03; u += 0.052 + rnd() * 0.012) garment(R, u, rodY, lenMin + rnd() * (lenMax - lenMin), wV);
    };
    const drawers = (R, u0, u1, y0, n, hDr) => {
        for (let i = 0; i < n; i++) {
            const y = y0 + i * (hDr + 0.012);
            R.P(u0 + T + 0.004, u1 - T - 0.004, D - 0.026, D, y, y + hDr, oak);
            R.P((u0 + u1) / 2 - 0.07, (u0 + u1) / 2 + 0.07, D, D + 0.016, y + hDr / 2 - 0.007, y + hDr / 2 + 0.007, metal);  // bar handle
        }
    };
    const shoes = (R, u0, u1, y) => {
        for (let u = u0 + T + 0.08; u < u1 - T - 0.07; u += 0.15) { const m = pick(shoeMat); const v = 0.2 + rnd() * 0.15; R.P(u - 0.05, u + 0.05, v, v + 0.27, y, y + 0.1, m); }
    };
    const bay = (R, u0, u1, type) => {
        const w = u1 - u0;
        R.P(u0, u0 + T, 0, D, 0, H, oak); R.P(u1 - T, u1, 0, D, 0, H, oak);                  // dividers
        R.P(u0 + T, u1 - T, 0, 0.012, 0.0, H, oakBack);                                        // back
        R.P(u0 + T, u1 - T, 0.02, D - 0.02, 0, 0.09, oakBack);                                 // plinth recess
        R.P(u0 + T, u1 - T, 0.01, D, H - T, H, oak);                                           // top
        R.P(u0 + T + 0.02, u1 - T - 0.02, D - 0.08, D - 0.03, H - T - 0.014, H - T, led);      // LED strip under the top
        const uc = (u0 + u1) / 2, inner = w - 2 * T;
        if (type === 'shelves') {
            for (let k = 0; k < 6; k++) { const y = 0.09 + k * ((H - 0.09) / 6); if (k) shelfBoard(R, u0, u1, y); }
            for (let k = 0; k < 6; k++) { const y = 0.09 + k * ((H - 0.09) / 6) + (k ? T : 0); if (k >= 3) stack(R, uc, D * 0.5, y, Math.min(inner - 0.08, 0.48), 0.34, 3 + Math.floor(rnd() * 3)); else if (k === 2) storageBox(R, uc, D * 0.5, y, Math.min(inner - 0.1, 0.42), 0.32, 0.27, k === 2 && rnd() < 0.4); else if (k < 2) stack(R, uc, D * 0.5, y, Math.min(inner - 0.08, 0.48), 0.34, 4 + Math.floor(rnd() * 2)); }
        } else if (type === 'hang2') {
            shelfBoard(R, u0, u1, 2.12); shelfBoard(R, u0, u1, 2.34);
            storageBox(R, uc - 0.12, D * 0.5, 2.12 + T, 0.3, 0.3, 0.25, false); storageBox(R, uc + 0.14, D * 0.5, 2.12 + T, 0.28, 0.3, 0.25, true);
            stack(R, uc, D * 0.5, 2.34 + T, Math.min(inner - 0.1, 0.46), 0.34, 3);
            hangRail(R, u0, u1, 1.98, 0.62, 0.86, 0.46);
            shelfBoard(R, u0, u1, 1.02);
            hangRail(R, u0, u1, 0.98, 0.42, 0.56, 0.4);
            shelfBoard(R, u0, u1, 0.1 + 0.0);
            shoes(R, u0, u1, 0.1 + T);
        } else if (type === 'hangLong') {
            shelfBoard(R, u0, u1, 2.18); storageBox(R, uc, D * 0.5, 2.18 + T, Math.min(inner - 0.1, 0.4), 0.3, 0.26, false);
            hangRail(R, u0, u1, 2.08, 1.15, 1.55, 0.46);
            shelfBoard(R, u0, u1, 0.36); shelfBoard(R, u0, u1, 0.17);
            shoes(R, u0, u1, 0.17 + T); shoes(R, u0, u1, 0.36 + T);
            storageBox(R, uc, D * 0.5, 0.09, Math.min(inner - 0.1, 0.4), 0.3, 0.08, true);
        } else if (type === 'drawers') {
            drawers(R, u0, u1, 0.1, 4, 0.205);
            shelfBoard(R, u0, u1, 0.98);
            for (let k = 0; k < 4; k++) { const y = 0.98 + T + k * 0.38; if (k) shelfBoard(R, u0, u1, y - T); stack(R, uc, D * 0.5, y + (k ? 0 : 0), Math.min(inner - 0.08, 0.48), 0.34, 3 + Math.floor(rnd() * 3)); }
        } else if (type === 'shoes') {
            for (let k = 0; k < 8; k++) { const y = 0.09 + k * 0.17; if (k) shelfBoard(R, u0, u1, y); if (k < 8) shoes(R, u0, u1, y + (k ? T : 0)); }
            for (let k = 0; k < 2; k++) { const y = 1.45 + k * 0.5; shelfBoard(R, u0, u1, y); storageBox(R, uc, D * 0.5, y + T, Math.min(inner - 0.08, 0.34), 0.3, 0.26, k === 1); }
        } else if (type === 'boxes') {   // back run: drawers below, boxes + folded stacks above (as the reference's side columns)
            drawers(R, u0, u1, 0.1, 2, 0.2);
            const sh = [0.58, 0.98, 1.34, 1.70, 2.04, 2.30];
            sh.forEach((y, k) => { shelfBoard(R, u0, u1, y); const yy = y + T; if (k === 1 || k === 2) { storageBox(R, uc, D * 0.5, yy, Math.min(inner - 0.1, 0.4), 0.32, 0.3, false); } else if (k < 5) stack(R, uc, D * 0.5, yy, Math.min(inner - 0.08, 0.5), 0.36, 3 + Math.floor(rnd() * 3)); else storageBox(R, uc, D * 0.5, yy, Math.min(inner - 0.1, 0.38), 0.3, 0.22, true); });
        }
    };

    // ---- the three runs
    const len = C.x1 - C.x0, bayN = [['drawers', 0.85], ['hang2', 0.95], ['hangLong', 0.9], ['shoes', 0.65], ['shelves', 0]], bayS = [['hangLong', 0.95], ['drawers', 0.85], ['hang2', 0.95], ['shelves', 0.9], ['shoes', 0]];
    const layout = (R, list) => { let used = list.reduce((s, b) => s + b[1], 0), u = 0; list.forEach(([t, w]) => { const ww = w || (len - used); bay(R, u, u + ww, t); u += ww; }); };
    const RN = Run(C.x0, C.zN, 1, 0, 0, 1), RS = Run(C.x0, C.zS, 1, 0, 0, -1);
    layout(RN, bayN); layout(RS, bayS);
    // east wall is glazed: the back run is a low drawer credenza under the windows (keeps the view, as in the reference title "wardrobes + view")
    const backLen = (C.zS - C.zN) - 2 * D, RB = Run(C.x1, C.zN + D, 0, 1, -1, 0), LH = 0.92;
    const lowBay = (u0, u1, n) => {
        RB.P(u0, u0 + T, 0, D, 0, LH, oak); RB.P(u1 - T, u1, 0, D, 0, LH, oak);
        RB.P(u0 + T, u1 - T, 0, 0.012, 0, LH, oakBack); RB.P(u0 + T, u1 - T, 0.02, D - 0.02, 0, 0.09, oakBack);
        drawers(RB, u0, u1, 0.1, n, (LH - 0.1) / n - 0.012);
    };
    const nb = 3, wb = backLen / nb;
    for (let i = 0; i < nb; i++) lowBay(i * wb, (i + 1) * wb, 3);
    RB.P(-0.01, backLen + 0.01, 0.0, D + 0.03, LH, LH + 0.04, oak);                         // oak top over the whole credenza
    { const uc = backLen / 2;
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), chrome); sc.scale.set(0.55, 1.5, 0.55);   // chrome sculpture, as on the reference bench
      sc.position.set(C.x1 - 0.28, LH + 0.04 + 0.12, C.zN + D + uc); g.add(sc);
      cb(0.1, 0.03, 0.1, metal, C.x1 - 0.28, LH + 0.055, C.zN + D + uc);
      cb(0.32, 0.012, 0.2, metal, C.x1 - 0.3, LH + 0.046, C.zN + D + uc - 0.55);                                    // tray
      storageBox(RB, uc + 0.55, 0.28, LH + 0.04, 0.34, 0.26, 0.2, false); }

    // ---- floor, crown mouldings, ceiling spots, island pouf
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(C.x1 - C.x0 + 0.6, C.zS - C.zN), floorMat);
    fl.rotation.x = -Math.PI / 2; fl.position.set((C.x0 - 0.6 + C.x1) / 2, 0.004, (C.zN + C.zS) / 2); fl.material.polygonOffset = true; fl.material.polygonOffsetFactor = -2; fl.material.polygonOffsetUnits = -2; g.add(fl);
    cb(len, 0.1, 0.07, molding, (C.x0 + C.x1) / 2, H + 0.05, C.zN + 0.035); cb(len, 0.1, 0.07, molding, (C.x0 + C.x1) / 2, H + 0.05, C.zS - 0.035);
    cb(len, 0.07, 0.03, molding, (C.x0 + C.x1) / 2, H + 0.12, C.zN + 0.015); cb(len, 0.07, 0.03, molding, (C.x0 + C.x1) / 2, H + 0.12, C.zS - 0.015);
    [[5.75, -5.95], [7.65, -5.95], [5.75, -3.95], [7.65, -3.95]].forEach(([x, z]) => {   // 4 ceiling spots, two lamps each like the reference
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), metal); base.position.set(x, ceilY - 0.025, z); g.add(base);
        [-0.05, 0.05].forEach((o, i) => {
            const can = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.11, 12), metal); can.position.set(x + o, ceilY - 0.1, z + 0.02); can.rotation.z = o * 5; can.rotation.x = 0.25; g.add(can);
            const ln = new THREE.Mesh(new THREE.CircleGeometry(0.032, 14), lens); ln.rotation.x = Math.PI / 2 + 0.25; ln.position.set(x + o + Math.sin(o * 5) * 0.06, ceilY - 0.158, z + 0.05); g.add(ln);
        });
    });
    cb(1.2, 0.4, 0.5, pouf, 6.55, 0.22, -4.94); cb(1.1, 0.05, 0.42, metal, 6.55, 0.025, -4.94);   // central pouf

    // ---- static scene content: no shadows, no per-frame matrix updates
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } o.matrixAutoUpdate = false; o.updateMatrix(); });
    floorGroups.F2.add(g);
}
