/* =====================================================================
   SECOND-FLOOR MASTER ENSUITE
   "Bathroom location visualization" by Konstantin Koretskyi (CC BY 4.0,
   https://sketchfab.com/3d-models/bathroom-location-visualization-88e098f078a04f0ca40165ab0540a21f), models/master_bathroom.glb (textures cut to 2048 / 1024 px, 9.6 MB).
   The source is a finished 4 x 6 m bathroom (tiled box open on one side: walk-in shower, wall-hung toilet, floating vanity with a vessel basin,
   towel radiator, bench, ceiling light). It replaces the plan's own toilet / shower / partition in the ensuite (see the F2 lists in the main script).
   Fit: the ensuite's inside faces are x -2.72..-0.33, z -7.09..-4.05 (2.39 x 3.04 m), floor at LEVEL.F2, ceiling CEIL.F2 (2.9 m).
     - SHELL (floor, ceiling, the wall tiling, the floor-to-ceiling cladding) is stretched to exactly that box, so tile faces sit on the house walls
       and nothing shows a gap; the open side of the model is the south side, which is the house's open doorway into the master bedroom.
     - FIXTURES keep their true size (uniform 0.507 scale, the factor that makes the 6 m depth fit the 3.04 m room). They are grouped into
       pieces (touching meshes move together), placed by their centre, kept flush to the wall they stand against, and ceiling items (rain head,
       light) follow the ceiling.
     - the east wall gets a doorway cut (clipping box) where the house has its second door (z -5.97..-5.27).
   Loaded after the main script; entry point masterBathInit() (window.onload). World metres: x east, z south.
===================================================================== */
const MBATH = {
    url: 'models/master_bathroom.glb',
    x0: -2.72, x1: -0.33, z0: -7.09, z1: -4.05,        // inside faces of the ensuite walls
    door: { z0: -5.97, z1: -5.27, h: 2.1 },            // east doorway (house wall x -0.33..-0.15)
    inset: 0.004,                                      // keep the model's wall faces a hair inside the house faces (no z-fighting)
    M: { x0: -200, x1: 200, z0: -300, z1: 300, y0: -200, y1: 200 }   // model room box (cm-like units)
};

function masterBathInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.F2) return;
    new THREE.GLTFLoader().load(MBATH.url, g => {
        const C = MBATH, M = C.M, root = g.scene; root.updateMatrixWorld(true);
        const FY = LEVEL.F2 + 0.03, Hn = CEIL.F2 - FY - 0.02;   // 3 cm above the slab: the house floor sits at +0.012 and would z-fight with the model floor
        const X0 = C.x0 + C.inset, X1 = C.x1 - C.inset, Z0 = C.z0 + C.inset, Z1 = C.z1 - C.inset;
        const kx = (X1 - X0) / (M.x1 - M.x0), kz = (Z1 - Z0) / (M.z1 - M.z0), ky = Hn / (M.y1 - M.y0), s = kz;   // s: uniform scale of the fixtures
        const env = typeof carEnv === 'function' ? carEnv() : null;

        // ---- collect meshes (model space world matrix + bbox)
        const items = []; root.traverse(o => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); items.push({ o, b, M: o.matrixWorld.clone(), sz: b.getSize(new THREE.Vector3()) }); } });
        const near = (a, b, t) => a.b.min.x <= b.b.max.x + t && a.b.max.x >= b.b.min.x - t && a.b.min.y <= b.b.max.y + t && a.b.max.y >= b.b.min.y - t && a.b.min.z <= b.b.max.z + t && a.b.max.z >= b.b.min.z - t;
        const onFloor = it => it.b.max.y <= M.y0 + 6 || it.b.min.y >= M.y1 - 6;                 // floor / ceiling tiles
        const onWall = it => (it.sz.x < 10 && Math.abs(it.b.min.x - M.x0) < 12 || it.sz.x < 10 && Math.abs(it.b.max.x - M.x1) < 12 || it.sz.z < 10 && Math.abs(it.b.min.z - M.z0) < 12) && Math.max(it.sz.y, it.sz.z, it.sz.x) > 60;
        const clad = it => it.b.min.y <= M.y0 + 4 && it.b.max.y >= M.y1 - 8 && it.b.min.z <= M.z0 + 12;   // floor-to-ceiling slats on the north wall
        const isShell = it => onFloor(it) || onWall(it) || clad(it);
        const shell = items.filter(isShell), fix = items.filter(i => !isShell(i));

        // ---- shell: stretch the model room onto the house room (tile faces land on the house faces)
        const A = new THREE.Matrix4().makeTranslation(X0, FY, Z0).multiply(new THREE.Matrix4().makeScale(kx, ky, kz)).multiply(new THREE.Matrix4().makeTranslation(-M.x0, -M.y0, -M.z0));
        // ---- fixtures: union-find on touching meshes -> pieces
        const par = fix.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
        for (let i = 0; i < fix.length; i++) for (let j = i + 1; j < fix.length; j++) if (near(fix[i], fix[j], 6)) par[find(i)] = find(j);
        const pieces = {}; fix.forEach((it, i) => { (pieces[find(i)] = pieces[find(i)] || []).push(it); });

        // ---- materials: the source has one alpha-blended material for everything. Opaque meshes get an opaque copy (no sorting artefacts),
        //      thin tall panels (the shower glass) stay transparent.
        const base = items[0].o.material;
        const opaque = base.clone(); opaque.transparent = false; opaque.depthWrite = true; opaque.alphaTest = 0; opaque.side = THREE.DoubleSide; opaque.envMap = env; opaque.envMapIntensity = 0.7; opaque.needsUpdate = true;
        const glass = base.clone(); glass.transparent = true; glass.depthWrite = false; glass.side = THREE.DoubleSide; glass.opacity = 0.55; glass.envMap = env; glass.envMapIntensity = 1.0; glass.needsUpdate = true;
        const isGlass = it => Math.min(it.sz.x, it.sz.z) < 6 && it.sz.y > 250;
        // doorway in the east wall: a clipping box (clipIntersection removes only the region inside ALL planes)
        const doorMat = opaque.clone(); doorMat.clipIntersection = true; renderer.localClippingEnabled = true;
        doorMat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), C.door.z0), new THREE.Plane(new THREE.Vector3(0, 0, 1), -C.door.z1), new THREE.Plane(new THREE.Vector3(0, 1, 0), -(FY + C.door.h))];

        const out = new THREE.Group(); out.name = 'master ensuite';
        const put = (it, mat, matrix) => { const m = new THREE.Mesh(it.o.geometry, mat); m.matrixAutoUpdate = false; m.matrix.copy(matrix); m.castShadow = m.receiveShadow = true; out.add(m); return m; };
        shell.forEach(it => {
            if (it.b.min.y >= M.y1 - 6) return;   // no ceiling tiles: the bathroom is open from above so it can be seen into (ceiling light and rain head stay)
            const eastWall = it.sz.x < 10 && Math.abs(it.b.max.x - M.x1) < 12;
            put(it, eastWall ? doorMat : opaque, new THREE.Matrix4().multiplyMatrices(A, it.M));
        });
        const log = [];
        Object.values(pieces).forEach(list => {
            const b = new THREE.Box3(); list.forEach(i => b.union(i.b));
            const sz = b.getSize(new THREE.Vector3()), cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
            const w = sz.x * s, west = b.min.x <= M.x0 + 6, east = b.max.x >= M.x1 - 6;
            let tx = X0 + (cx - M.x0) * kx;                                   // centre mapped across the stretched room
            if (west && !east) tx = X0 + w / 2; else if (east && !west) tx = X1 - w / 2;   // stands against a wall: stays flush to it
            const tz = Z0 + (cz - M.z0) * kz;
            const top = b.min.y > 60 && sz.y < 140;                           // ceiling-hung (rain head, light): keeps its distance to the ceiling
            const ty = top ? FY + Hn - (M.y1 - b.min.y) * s : FY + (b.min.y - M.y0) * s;
            const P = new THREE.Matrix4().makeTranslation(tx, ty, tz).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(-cx, -b.min.y, -cz));
            list.forEach(it => put(it, isGlass(it) ? glass : opaque, new THREE.Matrix4().multiplyMatrices(P, it.M)));
        });
        floorGroups.F2.add(out); MBATH.group = out;
        console.log('[master bath] shell ' + shell.length + ', fixtures ' + fix.length + ' in ' + Object.keys(pieces).length + ' pieces; kx ' + kx.toFixed(3) + ' kz ' + kz.toFixed(3) + ' ky ' + ky.toFixed(3));
    }, undefined, e => console.warn('master bathroom failed to load', e));
}
