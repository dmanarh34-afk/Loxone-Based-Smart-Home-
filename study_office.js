/* =====================================================================
   STUDY OFFICE (second floor)
   Replaces the plan's study furniture (desk, office chair, two chairs) with the "manager office" set
   (sight, CC BY 4.0, https://sketchfab.com/3d-models/manager-office-8bea2d8ff8ee4b2c9566c2cdb1da2561),
   models/manager_office.glb: 564k triangles decimated to ~154k and merged per material offline (6 MB).
   The source scene is a showroom row (two credenzas, a side table and the L-shaped executive desk with
   chairs, 8.7 m wide, in cm). Only the desk + chairs cluster is kept (triangle centroids, model x in
   [-335, -10] cm), scaled to metres, and fitted into the study. Loaded after the main script;
   entry point studyInit() (window.onload). Study floor (world m): x 4.22..8.24, z -2.57..0.37.
===================================================================== */
const STUDY = {
    room: { x0: 4.22, x1: 8.24, z0: -2.57, z1: 0.37 },   // between the north wall, the east / south wardrobes and the open west side
    keepX: [-335, -10],                                  // model cm: executive desk + chairs
    margin: 0.1, lift: 0.012
};
function studyInit() {
    if (typeof floorGroups === 'undefined' || !floorGroups.F2) return;
    new THREE.GLTFLoader().load('models/manager_office.glb', g => {
        const root = g.scene, v = new THREE.Vector3(), c = new THREE.Vector3(), kept = new THREE.Box3();
        root.updateMatrixWorld(true);
        root.traverse(o => {
            if (!o.isMesh) return;
            o.castShadow = o.receiveShadow = true;
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.normalMap = null; m.needsUpdate = true; });
            const P = o.geometry.attributes.position, I = o.geometry.index.array, keep = [];
            for (let t = 0; t < I.length; t += 3) {
                c.set(0, 0, 0);
                for (let k = 0; k < 3; k++) { v.fromBufferAttribute(P, I[t + k]).applyMatrix4(o.matrixWorld); c.add(v); }
                c.multiplyScalar(1 / 3);
                if (c.x >= STUDY.keepX[0] && c.x <= STUDY.keepX[1]) { keep.push(I[t], I[t + 1], I[t + 2]); kept.expandByPoint(c); }
            }
            o.geometry.setIndex(keep);
            o.visible = keep.length > 0;
        });
        const holder = new THREE.Group(); holder.add(root);
        const R = STUDY.room, m = STUDY.margin;
        const size = kept.getSize(new THREE.Vector3());                       // cm
        const s = Math.min(0.01, 0.88 * (R.x1 - R.x0 - 2 * m) / size.x, 0.88 * (R.z1 - R.z0 - 2 * m) / size.z);   // 88% of the free floor: room to walk round the desk and past the wardrobes
        holder.scale.setScalar(s); holder.updateMatrixWorld(true);
        const b = kept.clone().applyMatrix4(holder.matrixWorld), ctr = b.getCenter(new THREE.Vector3());
        // against the north wall, centred left-right but nudged away from the open west side's door swing
        holder.position.set((R.x0 + R.x1) / 2 + 0.1 - ctr.x, LEVEL.F2 + STUDY.lift - b.min.y, R.z0 + m - b.min.z);
        floorGroups.F2.add(holder);
    }, undefined, e => console.warn('study office model failed to load', e));
}
