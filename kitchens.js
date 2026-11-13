/* =====================================================================
   GROUND-FLOOR KITCHENS
   Main kitchen    <- "Kitchen Modern Set 3 3D Model" by ParienteChido (CC BY 4.0,
                      https://sketchfab.com/3d-models/kitchen-modern-set-3-3d-model-09474ccc5d484c2e887913af03b4e08a), models/kitchen_main.glb:
                      full-height cabinet wall with niche and appliance panel, island with sink, hob, tap and coffee machine. Metres.
   Wet kitchen     <- "Modern Kitchen" by dylanheyes (CC BY 4.0,
                      https://sketchfab.com/3d-models/modern-kitchen-9843a830b96142a9a53f45f25304d93c), models/kitchen_wet.glb:
                      only the cabinet run (units, stone top, dark tile splashback, sink, hob, oven, handles). The source room, windows,
                      stairs, island, stools and pendant lights are dropped offline. Its units are modelled at 0.457 m per unit.
   Both sources are bigger than the plan rooms, so each is cropped (clamped) to the wall run that fits and the geometry never changes
   scale for the main kitchen. Wet kitchen colours (cool-white cabinets, beige granite top, dark tiles) are the palette of the wet kitchen
   model; the main kitchen's dark wood is re-coloured to the same cabinet finish and granite top so both kitchens match.
   Loaded after the main script; entry point kitchensInit() (window.onload). The plan's own counters / island / sink counter /
   fridge for these two rooms are removed from INTERIOR.GF.furniture. World metres, x east, z south.
===================================================================== */
const KITCH = {
    wet:  { url: 'models/kitchen_wet.glb', scale: 0.457, win: { x0: 4.0, x1: 7.0, z0: -1.0, z1: 4.4 }, rotY: Math.PI,
            room: { x0: 0.26, x1: 2.94, z0: -5.22, z1: -2.6 } },
    main: { url: 'models/kitchen_main.glb', scale: 1.0, win: { x0: -2.38, x1: 1.18, z0: -9, z1: 9 }, rotY: 0,
            room: { x0: 4.66, x1: 8.2, z0: -2.32, z1: 1.4 } }
};
// clamp every mesh of `root` to the model-space window (triangles that do not touch it are dropped, the rest are clipped to its edges)
function kitchCrop(root, W) {
    root.updateMatrixWorld(true);
    const v = new THREE.Vector3(), inv = new THREE.Matrix4();
    root.traverse(o => {
        if (!o.isMesh) return;
        const g = o.geometry, P = g.attributes.position, I = g.index ? g.index.array : null; if (!I) return;
        inv.copy(o.matrixWorld).invert();
        const keep = [], ok = new Uint8Array(P.count), lo = [], hi = [];
        for (let t = 0; t < I.length; t += 3) {
            let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
            for (let k = 0; k < 3; k++) { v.fromBufferAttribute(P, I[t + k]).applyMatrix4(o.matrixWorld); mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z); }
            if (mxx < W.x0 || mnx > W.x1 || mxz < W.z0 || mnz > W.z1) continue;
            keep.push(I[t], I[t + 1], I[t + 2]); ok[I[t]] = ok[I[t + 1]] = ok[I[t + 2]] = 1;
        }
        for (let i = 0; i < P.count; i++) {
            if (!ok[i]) continue; v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
            v.x = Math.min(W.x1, Math.max(W.x0, v.x)); v.z = Math.min(W.z1, Math.max(W.z0, v.z)); v.applyMatrix4(inv); P.setXYZ(i, v.x, v.y, v.z);
        }
        P.needsUpdate = true; g.setIndex(keep); g.computeBoundingBox(); g.computeBoundingSphere(); o.visible = keep.length > 0;
    });
}
function kitchLoad(url, done) {
    new THREE.GLTFLoader().load(url, g => done(g.scene), undefined, e => console.warn('kitchen model failed: ' + url, e));
}
// bounding box of the vertices that are actually used by the (cropped) index, in world space
function kitchBox(root) {
    root.updateMatrixWorld(true); const b = new THREE.Box3(), v = new THREE.Vector3();
    root.traverse(o => { if (!o.isMesh || !o.visible || !o.geometry.index) return; const P = o.geometry.attributes.position, I = o.geometry.index.array; for (let i = 0; i < I.length; i++) { v.fromBufferAttribute(P, I[i]).applyMatrix4(o.matrixWorld); b.expandByPoint(v); } });
    return b;
}
function kitchenWetInit(root) {
    const C = KITCH.wet; kitchCrop(root, C.win);
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.normalMap = null; m.needsUpdate = true; }); } });
    const holder = new THREE.Group(); holder.add(root); holder.rotation.y = C.rotY; holder.scale.setScalar(C.scale); holder.updateMatrixWorld(true);
    const b = kitchBox(holder), R = C.room, cz = (R.z0 + R.z1) / 2;
    holder.position.set(R.x0 - b.min.x, LEVEL.GF + 0.012 - b.min.y, cz - (b.min.z + b.max.z) / 2);
    floorGroups.GF.add(holder);
    console.log('[kitchen wet] size ' + b.getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(2)) + ' room ' + (R.x1 - R.x0).toFixed(2) + ' x ' + (R.z1 - R.z0).toFixed(2));
    return holder;
}
function kitchenMainInit(root, wetRoot) {
    const C = KITCH.main; kitchCrop(root, C.win);
    // palette of the wet kitchen model: cabinet finish and granite top come straight from its materials
    let cab = null, top = null; wetRoot.traverse(o => { if (o.isMesh) { const n = o.material.name; if (n === 'Cupboard') cab = o.material; if (n === 'material_0') top = o.material; } });
    const cabM = cab ? cab.clone() : new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.3 });
    const topM = top ? top.clone() : new THREE.MeshStandardMaterial({ color: 0xcdbfa8, roughness: 0.4 });
    cabM.map = null; cabM.roughness = 0.28; cabM.metalness = 0.12; cabM.normalMap = null; cabM.metalnessMap = null; cabM.roughnessMap = null; cabM.needsUpdate = true;
    topM.color.multiplyScalar(0.8);
    if (topM.map) { topM.map.wrapS = topM.map.wrapT = THREE.RepeatWrapping; topM.map.repeat.set(2, 2); }
    const v = new THREE.Vector3(), n = new THREE.Vector3(), a = new THREE.Vector3(), b2 = new THREE.Vector3(), c = new THREE.Vector3(), extra = [];
    root.traverse(o => {
        if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
        const nm = o.material.name;
        if (nm === 'Wood_dark' || nm === 'Plastic') {
            // split the worktop (upward-facing triangles at worktop height) from the carcass; carcass -> cabinet finish, worktop -> granite
            const g = o.geometry, P = g.attributes.position, I = g.index.array, carc = [], tops = [];
            for (let t = 0; t < I.length; t += 3) {
                a.fromBufferAttribute(P, I[t]); b2.fromBufferAttribute(P, I[t + 1]); c.fromBufferAttribute(P, I[t + 2]);
                n.copy(b2).sub(a).cross(c.clone().sub(a)).normalize(); const y = (a.y + b2.y + c.y) / 3;
                (n.y > 0.9 && y > 0.75 && y < 1.0 ? tops : carc).push(I[t], I[t + 1], I[t + 2]);
            }
            g.setIndex(carc); o.material = cabM;
            if (tops.length) { const g2 = g.clone(); g2.setIndex(tops); const m2 = new THREE.Mesh(g2, topM); m2.castShadow = m2.receiveShadow = true; m2.matrix.copy(o.matrix); m2.matrixAutoUpdate = false; extra.push([o.parent, m2]); }
        } else (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.normalMap = null; m.needsUpdate = true; });
    });
    extra.forEach(([p, m]) => p.add(m));
    const holder = new THREE.Group(); holder.add(root); holder.rotation.y = C.rotY; holder.scale.setScalar(C.scale); holder.updateMatrixWorld(true);
    const bb = kitchBox(holder), R = C.room;
    holder.position.set(R.x0 - bb.min.x, LEVEL.GF + 0.012 - bb.min.y, R.z0 - bb.min.z);
    floorGroups.GF.add(holder);
    // refrigerator (the model has none): stainless double door in the south-west corner of the kitchen
    const steel = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.8, roughness: 0.3, envMap: typeof carEnv === 'function' ? carEnv() : null, envMapIntensity: 0.8 });
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.9, 0.72), steel); fr.position.set(R.x0 + 0.4, LEVEL.GF + 0.012 + 0.95, R.z1 - 0.38); fr.castShadow = true; floorGroups.GF.add(fr);
    const dark = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.2, 0.012), new THREE.MeshStandardMaterial({ color: 0x20252b })); dark.position.set(R.x0 + 0.4, LEVEL.GF + 0.012 + 1.05, R.z1 - 0.38 + 0.365); floorGroups.GF.add(dark);
    console.log('[kitchen main] size ' + bb.getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(2)) + ' room ' + (R.x1 - R.x0).toFixed(2) + ' x ' + (R.z1 - R.z0).toFixed(2));
    return holder;
}
function kitchensInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.GF) return;
    kitchLoad(KITCH.wet.url, wet => { kitchLoad(KITCH.main.url, main => { const wc = wet.clone(true); kitchenWetInit(wet); kitchenMainInit(main, wc); }); });
}
