/* =====================================================================
   STUDY BOOKSHELVES (second floor)
   - a floor-to-ceiling oak bookcase on the study's north wall, west of the desk: closed cabinet with three doors below, four open bays above
   - two long floating oak shelves on the north wall above the desk
   Every shelf is filled with books generated at start-up: random heights / widths / depths, muted cloth + leather colours, a lighter title label
   and gold bands on most spines, a few leaning at the end of a row, flat stacks, brass bookends, small vases and a plant. All books are two
   InstancedMeshes (spines + gold bands), so the whole study adds 3 draw calls for ~400 books. No lights are added (a changing light count
   would recompile every material); warm LED strips under the shelves are emissive meshes.
   Loaded after study_office.js; entry point studyShelvesInit() (window.onload). World metres: x east, z south; the north wall face is z -2.57.
===================================================================== */
const SHELF = {
    wallZ: -2.57, x0: 4.26, x1: 5.50,                  // bookcase: along the north wall, from the open west side to 0.11 m short of the desk
    H: 2.5, D: 0.34, T: 0.025, side: 0.03, plinth: 0.08, cabinet: 0.72, bays: 4,
    floating: { x0: 5.72, x1: 8.06, depth: 0.22, y: [1.55, 2.02] }
};

function studyShelvesInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.F2) return;
    const S = SHELF, FY = LEVEL.F2 + 0.012, g = new THREE.Group(); g.name = 'study shelves';
    let seed = 90210; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)], between = (a, b) => a + rnd() * (b - a);

    // ---- materials (oak texture is the closet's; plain colour stays if it fails to load)
    const oak = new THREE.MeshStandardMaterial({ color: 0xd9bf94, roughness: 0.55 }), oakDark = new THREE.MeshStandardMaterial({ color: 0xa8895f, roughness: 0.7 });
    new THREE.TextureLoader().load('textures/closet/oak.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; oak.map = t; oak.color.setHex(0xffffff); oak.needsUpdate = true; const t2 = t.clone(); t2.needsUpdate = true; oakDark.map = t2; oakDark.color.setHex(0xb59a73); oakDark.needsUpdate = true; });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3 });
    const led = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd9a0, emissiveIntensity: 1.6 });
    const ceramic = [0xe9e6df, 0x2f3b4a, 0x8a9a7b].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 }));
    const leaf = new THREE.MeshStandardMaterial({ color: 0x3e7a3a, roughness: 0.8 }), soil = new THREE.MeshStandardMaterial({ color: 0x2b211a, roughness: 1 });
    const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (parent || g).add(m); return m; };

    // ---- books: collected as instance records, built into two InstancedMeshes at the end
    const books = [];   // { x, y, z, rz, sx, sy, sz, col, label, bands }
    const PAL = [0x6b1d1d, 0x7a2a2a, 0x1f2f4f, 0x243b63, 0x2c4a33, 0x3d5a3a, 0x8a6a2b, 0x5a3b22, 0x3a2a1e, 0xd8cfb8, 0xc7b99a, 0x2a2d33, 0x4a4f57, 0x1f5a5e, 0x6c2f4a, 0xa4552b, 0xe8e4da, 0x7d8a96, 0x453a5e, 0x9b8a5a];
    const color = new THREE.Color();
    function fillShelf(x0, x1, yTop, zFront, depth, maxH, o = {}) {   // x0..x1 usable run, yTop = top of the shelf board, zFront = shelf front edge
        const front = zFront - 0.02, end = o.end || pick(['lean', 'lean', 'stack', 'vase', 'bookend']);
        const reserve = end === 'stack' ? 0.3 : end === 'lean' ? 0.14 : end === 'vase' ? 0.15 : 0.04;
        let x = x0 + 0.015; const lim = x1 - reserve - 0.01;
        while (x < lim) {
            if (rnd() < 0.05) { x += between(0.03, 0.08); continue; }               // a gap between books
            const w = between(0.018, 0.058), h = Math.min(maxH, between(0.2, 0.33)), d = between(0.15, 0.25) * (depth / 0.3);
            if (x + w > lim) break;
            books.push({ x: x + w / 2, y: yTop + h / 2, z: front - d / 2, rz: 0, sx: w, sy: h, sz: d, col: pick(PAL), label: rnd() < 0.6, bands: rnd() < 0.55 });
            x += w + 0.002;
        }
        const room = x1 - x - 0.01, ex = x + 0.005;
        if (end === 'lean' && room > 0.1) {          // pivot at the bottom-right corner of the row, top tilted left onto the last upright book
            const w = between(0.025, 0.045), h = Math.min(maxH, between(0.22, 0.3)), d = between(0.17, 0.23), a = between(0.14, 0.26), xr = Math.min(x1 - 0.012, ex + w * Math.cos(a) + h * Math.sin(a) + 0.01);
            books.push({ x: xr - (w / 2) * Math.cos(a) - (h / 2) * Math.sin(a), y: yTop + (h / 2) * Math.cos(a) - (w / 2) * Math.sin(a), z: front - d / 2, rz: a, sx: w, sy: h, sz: d, col: pick(PAL), label: true, bands: true });
            if (room > 0.2) fillRest(ex, xr - 0.1 - (h * Math.sin(a)), yTop, front, depth);
        } else if (end === 'stack' && room > 0.2) {  // flat pile: widest at the bottom
            let y = yTop; const n = Math.floor(between(2, 5));
            for (let i = 0; i < n; i++) { const len = between(0.17, 0.24), th = between(0.022, 0.045), d = between(0.15, 0.22); books.push({ x: x1 - 0.015 - len / 2 - between(0, 0.03), y: y + th / 2, z: front - d / 2, rz: Math.PI / 2, sx: th, sy: len, sz: d, col: pick(PAL), label: false, bands: rnd() < 0.5, flat: true }); y += th; if (y + 0.03 > yTop + maxH) break; }
        } else if (end === 'vase' && room > 0.1) {
            const m = pick(ceramic), r = between(0.035, 0.05), hh = between(0.14, 0.24), cx = x1 - 0.03 - r, cz = front - 0.1;
            const v = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, hh, 14), m); v.position.set(cx, yTop + hh / 2, cz); v.castShadow = true; g.add(v);
            if (rnd() < 0.6) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.6, 1), leaf); p.position.set(cx, yTop + hh + r * 1.1, cz); p.scale.y = 1.2; p.castShadow = true; g.add(p); }
        } else if (end === 'bookend') {
            box(0.012, 0.15, 0.13, brass, x1 - 0.02, yTop + 0.075, front - 0.075); box(0.07, 0.012, 0.13, brass, x1 - 0.055, yTop + 0.006, front - 0.075);
        }
    }
    function fillRest(xa, xb, yTop, front, depth) {   // a few short flat books laid in a leftover gap
        if (xb - xa < 0.1) return;
        const len = Math.min(xb - xa - 0.01, between(0.14, 0.2)), th = between(0.02, 0.03), d = between(0.14, 0.2);
        books.push({ x: xa + len / 2 + 0.005, y: yTop + th / 2, z: front - d / 2, rz: Math.PI / 2, sx: th, sy: len, sz: d, col: pick(PAL), label: false, bands: false, flat: true });
    }

    // ---- floor-to-ceiling bookcase on the north wall
    const W = S.x1 - S.x0, cx = (S.x0 + S.x1) / 2, zc = S.wallZ + S.D / 2, zf = S.wallZ + S.D;
    box(S.side, S.H, S.D, oak, S.x0 + S.side / 2, FY + S.H / 2, zc);                                   // left side
    box(S.side, S.H, S.D, oak, S.x1 - S.side / 2, FY + S.H / 2, zc);                                   // right side
    box(W, S.H, 0.012, oakDark, cx, FY + S.H / 2, S.wallZ + 0.006);                                    // back panel
    box(W, S.plinth, S.D - 0.03, oakDark, cx, FY + S.plinth / 2, zc + 0.012);                           // recessed plinth
    box(W + 0.04, 0.05, S.D + 0.03, oak, cx, FY + S.H + 0.025 - 0.05, zc + 0.012);                      // crown top
    const iw = W - 2 * S.side, ix0 = S.x0 + S.side, ix1 = S.x1 - S.side;
    const cabTop = FY + S.plinth + S.cabinet;
    box(iw, S.T, S.D - 0.02, oak, cx, FY + S.plinth + S.T / 2, zc);                                    // cabinet bottom
    box(iw, 0.03, S.D, oak, cx, cabTop - 0.015, zc);                                                   // cabinet top = first shelf
    for (let i = 0; i < 3; i++) {                                                                     // three doors with brass pulls
        const dw = iw / 3 - 0.006, dx = ix0 + iw / 3 * (i + 0.5);
        box(dw, S.cabinet - 0.05, 0.02, oak, dx, FY + S.plinth + 0.02 + (S.cabinet - 0.05) / 2, zf + 0.004);
        box(dw - 0.08, S.cabinet - 0.13, 0.006, oakDark, dx, FY + S.plinth + 0.02 + (S.cabinet - 0.05) / 2, zf + 0.016);   // raised panel
        box(0.012, 0.16, 0.012, brass, dx + (i === 1 ? 0 : (i === 0 ? 1 : -1)) * (dw / 2 - 0.045), FY + S.plinth + S.cabinet * 0.55, zf + 0.026);
    }
    const bayTop = FY + S.H - 0.05 - 0.03, bayH = (bayTop - cabTop - (S.bays - 1) * S.T) / S.bays;     // 4 open bays
    for (let b = 0; b < S.bays; b++) {
        const yBase = cabTop + b * (bayH + S.T);                                                         // top of the board each bay stands on
        if (b > 0) box(iw, S.T, S.D - 0.02, oak, cx, yBase - S.T / 2, zc);
        fillShelf(ix0, ix1, yBase, zf - 0.01, S.D - 0.04, bayH - 0.035);
        box(iw - 0.02, 0.008, 0.012, led, cx, yBase + bayH - 0.006, zf - 0.04);                          // warm LED strip under the board above
    }
    box(iw, 0.03, S.D, oak, cx, bayTop + 0.015, zc);                                                   // top board of the open part

    // ---- floating shelves over the desk
    const F = S.floating, fw = F.x1 - F.x0, fcx = (F.x0 + F.x1) / 2, fz = S.wallZ + F.depth / 2;
    F.y.forEach((y, i) => {
        box(fw, 0.04, F.depth, oak, fcx, FY + y - 0.02, fz);
        box(fw - 0.1, 0.008, 0.012, led, fcx, FY + y - 0.044, S.wallZ + F.depth - 0.03);
        fillShelf(F.x0 + 0.02, F.x1 - 0.02, FY + y, S.wallZ + F.depth, F.depth - 0.02, 0.3, { end: i ? 'vase' : 'bookend' });
        // a second run so the long shelf is not one block of books: cut by a vase / box in the middle
        if (i === 0) { const w = between(0.06, 0.09); box(w, 0.2, 0.12, ceramic[1], fcx + 0.1, FY + y + 0.1, S.wallZ + 0.11); }
    });

    // ---- build the book instances
    const bg = new THREE.BoxGeometry(1, 1, 1), bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
    const spines = new THREE.InstancedMesh(bg, bm, books.length);
    const trimN = books.filter(b => b.bands || b.label).length * 3, trim = new THREE.InstancedMesh(bg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.4 }), Math.max(1, trimN));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), E = new THREE.Euler(), up = new THREE.Vector3(0, 0, 1);
    let ti = 0;
    const addTrim = (bk, ox, oy, w, h, hex) => {   // small bar on the spine face, positioned in the book's own frame
        const off = new THREE.Vector3(ox, oy, bk.sz / 2 + 0.0008).applyQuaternion(Q); P.set(bk.x + off.x, bk.y + off.y, bk.z + off.z); Sc.set(w, h, 0.001);
        M.compose(P, Q, Sc); trim.setMatrixAt(ti, M); color.setHex(hex); trim.setColorAt(ti, color); ti++;
    };
    books.forEach((bk, i) => {
        Q.setFromAxisAngle(up, bk.rz); P.set(bk.x, bk.y, bk.z); Sc.set(bk.sx, bk.sy, bk.sz); M.compose(P, Q, Sc); spines.setMatrixAt(i, M);
        color.setHex(bk.col); color.offsetHSL(0, between(-0.04, 0.04), between(-0.03, 0.03)); spines.setColorAt(i, color);
        if (bk.flat) return;   // flat books show their page edge towards the front: no spine trim
        if (bk.bands) { addTrim(bk, 0, bk.sy * 0.38, bk.sx * 0.96, 0.006, 0xc9a24a); addTrim(bk, 0, -bk.sy * 0.38, bk.sx * 0.96, 0.006, 0xc9a24a); }
        if (bk.label) addTrim(bk, 0, bk.sy * 0.08, bk.sx * 0.7, bk.sy * 0.22, rnd() < 0.5 ? 0xe9e1c8 : 0xb9362e);
    });
    trim.count = ti;
    spines.castShadow = true; spines.receiveShadow = true; spines.frustumCulled = false; trim.frustumCulled = false; spines.instanceMatrix.needsUpdate = trim.instanceMatrix.needsUpdate = true;
    spines.instanceColor.needsUpdate = true; if (trim.instanceColor) trim.instanceColor.needsUpdate = true;
    g.add(spines, trim);
    floorGroups.F2.add(g); STUDY_SHELVES = g;
    console.log('[study shelves] ' + books.length + ' books, ' + ti + ' spine details');
}
let STUDY_SHELVES = null;
