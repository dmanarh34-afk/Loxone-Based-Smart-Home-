/* =====================================================================
   GROUND-FLOOR SAUNA + GUEST BEDROOM + BOY'S QUARTERS
   Sauna          <- "Sauna" (PrincessSayumi92, CC BY 4.0, https://sketchfab.com/3d-models/sauna-a86c962c5e504415bfa720a220c3cc32),
                     models/sauna.glb: a black cabin with wooden interior, two benches, stove and control panel, open on its +z face.
                     The model is in 0.1 mm units (1 unit = 1e-4 m): 1.55 x 1.55 x 2.28 m, scaled uniformly to fit the sauna cell.
   Guest bedroom  <- "Bedroom Corner" (syntheticplants, CC BY 4.0, https://sketchfab.com/3d-models/bedroom-corner-cd956b2abec04b52ac48bea1ec141d60),
   Boy's quarters    models/bedroom_corner.glb: bed with bedding, bedside table, lamp and plant. Modelled in inches (0.0254 m per unit):
                     2.44 x 2.62 m with the bedside table. The bed head is at model -x, the bedside table on +z.
                     Guest room: true size, head against the east wall. Boy's room (2.25 m wide): scaled to 0.8 (a single bed), head
                     against the north wall, bedside table on the west side.
   The plan's own guest bed + head cabinet, sauna bench and boy's bed are removed from INTERIOR.GF.furniture.
   Loaded after the main script; entry point gfRoomsInit() (window.onload). World metres, x east, z south.
===================================================================== */
const GFR = {
    sauna: { url: 'models/sauna.glb', unit: 1e-4, cell: { x0: -7.43, x1: -6.09, z0: -3.55, z1: -2.22 }, gap: 0.015 },
    bed: { url: 'models/bedroom_corner.glb', unit: 0.0254 },
    guest: { room: { x0: -5.95, x1: -2.17, z0: -5.4, z1: -0.8 }, rotY: Math.PI, scale: 1.0, zc: -3.1 },
    boys: { room: { x0: 5.8, x1: 8.15, z0: -5.4, z1: -2.5 }, rotY: -Math.PI / 2, scale: 0.8, xc: null }
};
function gfrPrep(root) {
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.normalMap = null; m.needsUpdate = true; }); } });
}
function gfrLoad(url, done) { new THREE.GLTFLoader().load(url, g => done(g.scene), undefined, e => console.warn('model failed: ' + url, e)); }
function gfrBox(obj) { obj.updateMatrixWorld(true); return new THREE.Box3().setFromObject(obj); }
function gfRoomsInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.GF) return;
    const y0 = LEVEL.GF + 0.012;
    // ---- sauna
    gfrLoad(GFR.sauna.url, root => {
        gfrPrep(root);
        root.traverse(o => { if (o.isMesh && /^Object_(10|12)$/.test(o.name)) o.visible = false; });   // cabin roof panels: the cell is closed by the first-floor slab anyway, and the open top lets cutaway / top-down views (and the cinematic tour) see the benches and stove
        const C = GFR.sauna.cell, h = new THREE.Group(); h.add(root); h.scale.setScalar(GFR.sauna.unit);
        let b = gfrBox(h), s = Math.min((C.x1 - C.x0 - 2 * GFR.sauna.gap) / (b.max.x - b.min.x), (C.z1 - C.z0 - 2 * GFR.sauna.gap) / (b.max.z - b.min.z));
        h.scale.setScalar(GFR.sauna.unit * s); b = gfrBox(h);
        h.position.set((C.x0 + C.x1) / 2 - (b.min.x + b.max.x) / 2, y0 - b.min.y, C.z1 - GFR.sauna.gap - b.max.z);   // open front (+z) towards the door in the south wall
        floorGroups.GF.add(h);
        const L = new THREE.PointLight(0xff9a4a, 0.9, 3.2, 2); L.position.set((C.x0 + C.x1) / 2, y0 + 1.7, (C.z0 + C.z1) / 2 + 0.1); floorGroups.GF.add(L);   // warm sauna glow
        console.log('[sauna] scale ' + s.toFixed(3) + ' size ' + b.getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(2)));
    });
    // ---- bedrooms
    const bedAt = (cfg, name, place) => gfrLoad(GFR.bed.url, root => {
        gfrPrep(root); const h = new THREE.Group(), inner = new THREE.Group(); inner.add(root); h.add(inner);
        inner.scale.setScalar(GFR.bed.unit * cfg.scale); inner.rotation.y = cfg.rotY;
        let frame = null, bigest = 0; root.traverse(o => { if (o.isMesh) { const v = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); const a = v.x * v.z * v.y; if (a > bigest && /blinn1/.test(o.material.name)) { bigest = a; frame = o; } } });
        h.updateMatrixWorld(true); const b = gfrBox(h), fb = frame ? gfrBox(frame) : b, fc = fb.getCenter(new THREE.Vector3());
        const p = place(b, fc); h.position.set(p.x, y0 - b.min.y, p.z); floorGroups.GF.add(h);
        const nb = gfrBox(h); console.log('[' + name + '] size ' + nb.getSize(new THREE.Vector3()).toArray().map(v => v.toFixed(2)) + ' x[' + nb.min.x.toFixed(2) + ',' + nb.max.x.toFixed(2) + '] z[' + nb.min.z.toFixed(2) + ',' + nb.max.z.toFixed(2) + ']');
    });
    // guest: head against the east wall, bed centred on the room's length
    bedAt(GFR.guest, 'guest bed', (b, fc) => ({ x: GFR.guest.room.x1 - b.max.x, z: GFR.guest.zc - fc.z }));
    // boy: head against the north wall, bed centred between the west partition and the east wall
    bedAt(GFR.boys, 'boys bed', (b, fc) => ({ x: (GFR.boys.room.x0 + GFR.boys.room.x1) / 2 - fc.x, z: GFR.boys.room.z0 + 0.03 - b.min.z }));
}
