/* =====================================================================
   POOL-AREA PLANTING
   Replaces the plain green blobs along the pool deck with two potted plants:
   - "Low-poly snake plant" by assetfactory  models/snake_plant.glb (Sketchfab Standard licence, see README.md)
   - "Decor plant - Maidenhair fern" by assetfactory  models/fern.glb (Sketchfab Standard licence, see README.md)
   Each source is a plant in its own pot with soil. They are sized to real garden-pot proportions (snake plant ~0.85 m,
   fern ~0.7 m tall), stood on the deck top and arranged in three runs: a narrow row of snake plants on the west edge
   strip, and alternating fern / snake pots along the north and south deck strips (clear of the bollards, the plunge pool and
   the pergola columns). Loaded after the main script; entry point poolPlantsInit() (window.onload). World metres.
===================================================================== */
const POOLPLANTS = {
    deckY: 0.45,
    snake: { url: 'models/snake_plant.glb', h: 0.85 },
    fern:  { url: 'models/fern.glb', h: 0.7 },
    // [type, x, z, size multiplier]
    spots: [
        // west edge strip (between the deck edge and the coping), snake plants only: the strip is under 0.5 m wide
        ['snake', -9.63, 1.5, 0.9], ['snake', -9.63, 3.7, 1.0], ['snake', -9.63, 5.9, 0.9], ['snake', -9.63, 8.0, 1.0],
        // south strip (z 8.8 .. 9.8), clear of the bollards at x -9.4, -7.6, -3.0
        ['fern', -8.5, 9.3, 1.0], ['snake', -6.8, 9.35, 1.1], ['fern', -5.5, 9.3, 1.05], ['snake', -4.3, 9.35, 1.0], ['fern', -2.3, 9.3, 1.0],
        // north strip (z -0.67 .. 0.64), clear of the bollards at x -9.4, -7.6
        ['fern', -8.5, 0.0, 1.0], ['snake', -6.6, -0.1, 1.1], ['fern', -5.0, 0.0, 1.05], ['snake', -3.6, -0.1, 1.0], ['fern', -2.4, 0.0, 0.95]
    ]
};
function poolPlantsInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.GF) return;
    const load = (key, done) => new THREE.GLTFLoader().load(POOLPLANTS[key].url, g => {
        const root = g.scene; root.updateMatrixWorld(true);
        root.traverse(o => {
            if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
                m.normalMap = null;
                if (m.transparent || m.alphaTest > 0 || (m.map && /leaf/i.test(m.name))) { m.alphaTest = Math.max(m.alphaTest || 0, 0.45); m.transparent = false; m.depthWrite = true; m.side = THREE.DoubleSide; }
                if (m.name && /leaf/i.test(m.name)) { m.color.setScalar(1.15); }
                m.needsUpdate = true;
            });
        });
        const b = new THREE.Box3().setFromObject(root), holder = new THREE.Group(), inner = new THREE.Group();
        inner.add(root); const pb = new THREE.Box3(); root.traverse(o => { if (o.isMesh && /pot/i.test(o.material.name || '')) pb.expandByObject(o); });   // stand on the POT, not on stray leaf tips below it
        const base = pb.isEmpty() ? b.min.y : pb.min.y;
        inner.position.set(-(b.min.x + b.max.x) / 2, -base, -(b.min.z + b.max.z) / 2);   // pot bottom at y 0, centred on x / z
        holder.add(inner); holder.userData.base = POOLPLANTS[key].h / (b.max.y - base);
        done(holder);
    }, undefined, e => console.warn('pool plant model failed: ' + key, e));
    const proto = {}, ready = () => {
        let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        POOLPLANTS.spots.forEach(([k, x, z, m]) => {
            const p = proto[k].clone(true); p.scale.setScalar(proto[k].userData.base * m);
            p.rotation.y = rnd() * Math.PI * 2; p.position.set(x, POOLPLANTS.deckY, z); floorGroups.GF.add(p);
        });
    };
    load('snake', h => { proto.snake = h; if (proto.fern) ready(); });
    load('fern', h => { proto.fern = h; if (proto.snake) ready(); });
}
