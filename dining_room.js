/* =====================================================================
   GROUND-FLOOR DINING AREA
   "Modern Dining Room" by dylanheyes (CC BY 4.0, https://sketchfab.com/3d-models/modern-dining-room-df3f3c9f6233447eb8b7ee129f3bace5),
   models/dining_room.glb: the source is a whole furnished room (floor, walls, roof, window, curtains, wall art) of which only the
   dining set is kept: table with eight chairs, rug, centrepiece (pot + plant) and the linear pendant light. Textures cut to 768 px,
   geometry decimated (6 MB). Replaces the plan's own table and 8 chairs.
   Model units are metres, floor at y = -1.47, table long axis along x. The set is turned so the table runs north-south like the plan's
   table, centred on it, with the rug flat on the floor. The source ceiling is 2.97 m above its floor, the same as this room
   (CEIL.GF 3.42 - LEVEL.GF 0.45), so the pendant light lands exactly on the ceiling. The light glass uses the 'dining' Loxone light zone's
   emissive material, so it follows the zone's on / off, level and colour; the three plan pendants (Loxone devices) keep their markers
   but their placeholder meshes are hidden. Loaded after the main script; entry point diningInit() (window.onload).
===================================================================== */
const DINING = { centre: { x: 0.67, z: 2.49 }, area: { x0: -1.5, x1: 3.0, z0: 0.2, z1: 4.8 }, lift: 0.012 };
function diningInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.GF) return;
    new THREE.GLTFLoader().load('models/dining_room.glb', g => {
        const root = g.scene; root.updateMatrixWorld(true);
        let table = null, carpet = null;
        root.traverse(o => {
            if (!o.isMesh) return; o.castShadow = o.name !== 'Carpet_Carpet_0'; o.receiveShadow = true;
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.normalMap = null; m.needsUpdate = true; });
            if (/^DiningTable/.test(o.name)) table = o; if (/^Carpet/.test(o.name)) carpet = o;
            if (/^LightGlass/.test(o.name) && typeof zones !== 'undefined' && zones.dining) o.material = zones.dining.spotMat;   // Loxone-controlled glow
        });
        const holder = new THREE.Group(); holder.add(root); holder.rotation.y = Math.PI / 2; holder.updateMatrixWorld(true);
        const A = DINING.area, tb = new THREE.Box3().setFromObject(table), cb = new THREE.Box3().setFromObject(carpet), all = new THREE.Box3().setFromObject(holder);
        const s = Math.min(1, (A.x1 - A.x0) / (cb.max.x - cb.min.x), (A.z1 - A.z0) / (cb.max.z - cb.min.z));
        holder.scale.setScalar(s); holder.updateMatrixWorld(true);
        const t2 = new THREE.Box3().setFromObject(table), c = t2.getCenter(new THREE.Vector3()), floor = new THREE.Box3().setFromObject(carpet).min.y;
        holder.position.set(DINING.centre.x - c.x, LEVEL.GF + DINING.lift - floor, DINING.centre.z - c.z);
        floorGroups.GF.add(holder);
        // the plan's three placeholder pendants: keep the Loxone device (marker, zone), hide its meshes
        devices.filter(d => d.type === 'pendant').forEach(d => d.root.children.forEach(ch => { if (ch.isMesh) ch.visible = false; }));
        console.log('[dining] scale ' + s.toFixed(2) + ' set ' + (cb.max.x - cb.min.x).toFixed(2) + ' x ' + (cb.max.z - cb.min.z).toFixed(2) + ' m');
    }, undefined, e => console.warn('dining room model failed to load', e));
}
