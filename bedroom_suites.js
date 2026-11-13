/* =====================================================================
   FIRST-FLOOR SUITES: MALE + FEMALE BEDROOMS
   Male suite   <- "Master Black&White Bedroom" by Ren Viro Store (CC BY 4.0,
                   https://sketchfab.com/3d-models/master-blackwhite-bedroom-4a2ea32c65dd48fe991f17473c92ede4)
                   models/bedroom_bw.glb  : bed, rug, bedside table (mirrored to make a pair), lamps, picture.
   Female suite <- "Modern Bedroom" by dylanheyes (CC BY 4.0,
                   https://sketchfab.com/3d-models/modern-bedroom-ab1e4522dcae4af1bbd39299ab382f37)
                   models/bedroom_modern.glb : bed, duvet, pillows, rug, end tables, lamps, chair, painting.
   Both sources are whole furnished rooms (walls, floor, ceiling, closets...). They were trimmed offline to the loose furniture, textures cut
   to 512 px. Each set is rotated so the bed head sits on the suite's west wall (as the plan's bed), uniformly scaled to fit the room
   with a clear walking margin, and centred on the room. The plan's own bed + bedside tables for these two suites are removed.
   Loaded after the main script; entry point suitesInit() (window.onload). Coordinates are world metres (x east, z south).
===================================================================== */
const SUITES = [
    {   // inner floor faces: west wall x=-8.31, east wall (ensuite side) x=-3.42, north wall z=-5.92, south (stair void) z~-1.2
        name: 'Male Suite', url: 'models/bedroom_bw.glb', room: { x0: -8.31, x1: -3.42, z0: -5.92, z1: -1.55 },
        headFront: 'north',   // model: head of bed at -z
        mirror: /^Nightstand/, fit: 0.95, bedRe: /^Bed_/, center: null, drop: null,
        // the west wall is a window wall (glass 0.9 - 2.6 m), so the poster hangs on the solid east wall segment between the ensuite door and the shower wall, facing the bed
        poster: { re: /^Picture/, x: -3.43, z: -3.56, y: 1.55, rotY: -Math.PI / 2 }
    },
    {   // west wall x=-1.44, east wall x=2.78, north z=-5.97, south z=-1.77
        name: 'Female Suite', url: 'models/bedroom_modern.glb', room: { x0: -1.44, x1: 2.78, z0: -5.97, z1: -1.77 },
        headFront: 'south',   // model: head of bed at +z
        mirror: null, fit: 0.92, bedRe: /(BedFrame|Duvet|Pillows)/, center: null, drop: /Chair/,
        // the model hangs the painting ~0.8 m in front of the headboard: mount it flat on the west (head) wall, centred over the bed, 1.6 m up
        poster: { re: /Painting/, x: -1.425, z: -3.97, y: 1.6, rotY: -Math.PI / 2 }
    }
];

function suitesInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.F1) return;
    bathFemaleInit();
    SUITES.forEach(S => new THREE.GLTFLoader().load(S.url, g => {
        const root = g.scene; root.updateMatrixWorld(true);
        root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.normalMap = null; m.needsUpdate = true; }); } });
        // bed centre line (for mirroring the bedside table) = centre of the bed meshes
        const bedBox = new THREE.Box3(); root.traverse(o => { if (o.isMesh && S.bedRe.test(o.name)) bedBox.expandByObject(o); });
        const bedCx = bedBox.isEmpty() ? 0 : (bedBox.min.x + bedBox.max.x) / 2;
        if (S.drop) { const rm = []; root.traverse(o => { if (o.isMesh && S.drop.test(o.name)) rm.push(o); }); rm.forEach(o => o.parent && o.parent.remove(o)); }
        if (S.center) {   // wall art goes over the middle of the bed head
            const mv = []; root.traverse(o => { if (o.isMesh && S.center.test(o.name)) mv.push(o); });
            mv.forEach(o => { const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()), w = new THREE.Group(); root.add(w); w.attach(o); w.position.x += bedCx - c.x; });
            root.updateMatrixWorld(true);
        }
        if (S.mirror) {
            const cx = bedCx, add = [];
            root.traverse(o => { if (o.isMesh && S.mirror.test(o.name)) add.push(o); });
            add.forEach(o => {   // mirror across the bed centre line (world x = cx in model space)
                const w = new THREE.Group(), c = o.clone();          // the model root has an identity transform, so a mesh's world matrix is its matrix in model space
                c.matrixAutoUpdate = false; c.matrix.copy(o.matrixWorld);
                w.add(c); w.scale.x = -1; w.position.x = 2 * cx; root.add(w);
            });
        }
        let posterMesh = null;
        if (S.poster) { root.traverse(o => { if (o.isMesh && S.poster.re.test(o.name)) posterMesh = o; }); if (posterMesh) { const M = posterMesh.matrixWorld.clone(); posterMesh.parent.remove(posterMesh); posterMesh.matrixAutoUpdate = false; posterMesh.matrix.copy(M); } }
        // orient: head of bed to the west wall. model head -z (north) needs +90deg about y, head +z (south) needs -90deg.
        const holder = new THREE.Group(), rotY = S.headFront === 'north' ? Math.PI / 2 : -Math.PI / 2;
        holder.add(root); holder.rotation.y = rotY; holder.updateMatrixWorld(true);
        const box0 = new THREE.Box3().setFromObject(holder), sz = box0.getSize(new THREE.Vector3());
        const R = S.room, avW = R.x1 - R.x0, avD = R.z1 - R.z0;
        const s = Math.min(1, S.fit * avW / sz.x, S.fit * avD / sz.z);
        holder.scale.setScalar(s); holder.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(holder);
        holder.position.set(R.x0 + 0.04 - b.min.x, LEVEL.F1 + 0.012 - b.min.y, (R.z0 + R.z1) / 2 - (b.min.z + b.max.z) / 2);
        floorGroups.F1.add(holder);
        if (posterMesh) {   // poster: own group, same scale as the set, centred on the wall spot, facing into the room
            const c = new THREE.Box3().setFromObject(posterMesh).getCenter(new THREE.Vector3()), pivot = new THREE.Group(), fix = new THREE.Group();
            posterMesh.matrixWorldNeedsUpdate = true; fix.add(posterMesh); fix.position.copy(c).multiplyScalar(-1); pivot.add(fix);
            pivot.scale.setScalar(s); pivot.rotation.y = S.poster.rotY; pivot.position.set(S.poster.x, LEVEL.F1 + S.poster.y, S.poster.z); floorGroups.F1.add(pivot);
        }
        console.log('[suite] ' + S.name + ' scale ' + s.toFixed(2) + ' set ' + sz.x.toFixed(2) + ' x ' + sz.z.toFixed(2) + ' m');
    }, undefined, e => console.warn(S.name + ' model failed to load', e)));
}

/* ---------------------------------------------------------------------------------------------------------------------
   FEMALE SUITE BATHROOM ("WC / Sho. 7 m2", east of the suite)
   Fixtures from "Gebron Bathroom 2 - 64 Tub 4-11wall" by bryce.ussery (CC BY 4.0,
   https://sketchfab.com/3d-models/gebron-bathroom-2-64-tub-4-11wall-39a29579410e460fa61ab8d1281ad3c1), models/bathroom_fixtures.glb:
   the 64" freestanding tub, toilet, double vessel-sink vanity and towel bar, kept at their TRUE size (the source is a 3.8 x 5.1 m
   luxury bath, too big for a 2.4 x 2.8 m room, so it is not scaled down: the fixtures are re-laid out like an interior designer would).
   Room interior (world m): x 3.74..6.15, z -6.61..-3.77, entered from the suite through the opening in the west wall (z -4.9..-3.8).
   North wall: toilet in the NW corner, tub in the NE corner; south wall: double vanity with a mirror; towel bar on the east wall.
   The plan's own shower / toilet / vanity for this room are removed (see the F1 furniture list).
--------------------------------------------------------------------------------------------------------------------- */
const BATH_F = { room: { x0: 3.74, x1: 6.15, z0: -6.61, z1: -3.77 } };
function bathFemaleInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.F1) return;
    new THREE.GLTFLoader().load('models/bathroom_fixtures.glb', g => {
        const root = g.scene; root.updateMatrixWorld(true);
        const ms = []; root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const a = Array.isArray(o.material) ? o.material : [o.material]; a.forEach(m => { m.normalMap = null; m.needsUpdate = true; }); ms.push(o); } });
        const bx = o => new THREE.Box3().setFromObject(o);
        const groups = { toilet: [], tub: [], vanity: [], towel: [] };
        ms.forEach(o => {
            const b = bx(o), c = b.getCenter(new THREE.Vector3());
            if (c.y > 0.9 && c.z < -2.3) groups.towel.push(o);
            else if (c.z > -0.2) groups.vanity.push(o);
            else if (c.x < -1.0) groups.toilet.push(o);
            else groups.tub.push(o);
        });
        const R = BATH_F.room, y0 = LEVEL.F1 + 0.014, make = (list, anchor) => {   // anchor: 'north' = back at min z, 'south' = back at max z; returns { pivot, box }
            const box = new THREE.Box3(); list.forEach(o => box.union(bx(o)));
            const pivot = new THREE.Group(), inner = new THREE.Group(); list.forEach(o => inner.attach(o));
            const ax = (box.min.x + box.max.x) / 2, az = anchor === 'north' ? box.min.z : box.max.z;
            inner.position.set(-ax, -box.min.y, -az); pivot.add(inner); return { pivot, box };
        };
        const place = (item, x, z, rotY) => { item.pivot.position.set(x, y0, z); item.pivot.rotation.y = rotY || 0; floorGroups.F1.add(item.pivot); };
        const eps = 0.012;                                   // keep the backs a hair off the walls
        place(make(groups.tub, 'north'), 5.30, R.z0 + eps);                   // 1.62 m tub in the NE corner, spans x 4.49 - 6.11
        place(make(groups.toilet, 'north'), 4.03, R.z0 + eps);                // toilet in the NW corner, 0.25 m clear of the tub
        place(make(groups.vanity, 'south'), 5.00, R.z1 - eps);                // double vanity on the south wall, back to the wall
        place(make(groups.towel, 'north'), R.x1 - eps, -4.95, -Math.PI / 2);  // towel bar on the east wall between the tub and the door side
        // mirror over the vanity (the model's own mirrors belong to its other layout)
        const mir = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.02), new THREE.MeshStandardMaterial({ color: 0xdde5ec, metalness: 1, roughness: 0.05, envMap: typeof carEnv === 'function' ? carEnv() : null, envMapIntensity: 1.0 }));
        mir.position.set(5.00, LEVEL.F1 + 1.62, R.z1 - 0.012); floorGroups.F1.add(mir);
    }, undefined, e => console.warn('bathroom fixtures failed to load', e));
}
