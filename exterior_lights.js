/* =====================================================================
   EXTERIOR LIGHTING, CONTROLLED BY LOXONE
   One exterior RGBW light circuit, registered as an ordinary Loxone light zone (the same `zones` objects the rooms use), so it is
   dimmed / coloured / switched from the Lighting tab, from the wall tablets, by the Day / Dusk / Night / Party / Away scenes and by
   "All lights on / off", exactly like the interior lights:
     ext-wall     Forecourt lamp posts   two bright lamp posts in front of the building (no lights are mounted on the walls)
     ext-garden   Garden uplights   ground uplights under the trees and palms (no fixtures are mounted on the building walls)
   ext-boundary Boundary wall lights   shielded lamps on top of the compound wall, one every 4 m. Emissive fixtures only: no light source, no
                glow cone, so nothing spreads into the compound; the wall lights are seen, they do not light the garden.
   ext-roofline Roofline LED strip   RGBW LED strip round the building, on the outer face of the roof parapet ROOFLINE.drop below its top edge.
                Emissive only (no light source), cycles colour in the Party scene like the other RGBW strips.
   ext-glass    Glass facade LED strip   RGBW LED strip along the head of every glass front (ground, first and second floor, incl. the double-height
                glass box), on the outer face of the grey band above the glass. Emissive only.
   Light output follows the zone level and colour; the real light sources are only strong when the sky is dark (dusk / night), as a
   Loxone astro / brightness input would do. Loaded after the main script; entry point extLightsInit() (window.onload).
===================================================================== */
const EXTL = { zones: {}, built: false };
const ROOFLINE = { drop: 0.30 };   // metres below the top edge of the roof parapet (30 cm)

function extLightsInit() {
    if (EXTL.built || typeof zones === 'undefined' || !floorGroups.GF) return; EXTL.built = true;
    FLOOR_LABEL.EXT = 'Exterior';
    const mkZone = (id, name, sub) => {
        const z = {
            id, name, sub, floor: 'EXT', on: true, level: 80, color: '#ffd29a', hasRgbw: true, hasSpeakers: false, autoUntil: 0, ext: true, fx: [],
            spotMat: new THREE.MeshStandardMaterial({ color: 0xfffaf0, emissive: 0xffd08a, emissiveIntensity: 1.5 }),
            coneMat: new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
            rgbwMat: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xff7a1a, emissiveIntensity: 1.5 }),
            light: new THREE.PointLight(0xffd29a, 0, 1)   // placeholder for applyZone(); the real sources are z.fx
        };
        zones[id] = z; EXTL.zones[id] = z; return z;
    };
    const Z = { wall: mkZone('ext-wall', 'Forecourt lamp posts', 'RGBW lamp posts · Dimmer Tree'), garden: mkZone('ext-garden', 'Garden uplights', 'RGBW ground uplights · DMX'), boundary: mkZone('ext-boundary', 'Boundary wall lights', 'RGBW wall-top lights · shielded, no spill'), roof: mkZone('ext-roofline', 'Roofline LED strip', 'RGBW LED strip · DMX'), glass: mkZone('ext-glass', 'Glass facade LED strip', 'RGBW LED strip · DMX') };
    Z.wall.level = 100; Z.wall.gain = 0.14;
    const housing = new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.5, metalness: 0.6 });
    const light = (z, kind, x, y, z0, base, tx, ty, tz) => {
        let l; if (kind === 'point') l = new THREE.PointLight(0xffd29a, 0, 7, 2); else { l = new THREE.SpotLight(0xffd29a, 0, 14, 0.7, 0.6, 1.5); l.target.position.set(tx, ty, tz); scene.add(l.target); }
        l.position.set(x, y, z0); scene.add(l); z.fx.push({ light: l, base }); return l;
    };
    // an open glow cone: apex at (x, y, z), pointing down (dir -1) or up (dir +1), length h, base radius r
    const cone = (z, parent, x, y, zz, dir, h, r) => {
        const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 18, 1, true), z.coneMat); m.position.set(x, y + dir * h / 2, zz); if (dir > 0) m.rotation.x = Math.PI;
        m.renderOrder = 4; parent.add(m); return m;
    };
    // ---- two bright lamp posts on the forecourt in front of the building
    [[-2.0, 14.2], [5.6, 14.2]].forEach(([x, zz]) => {
        const g = new THREE.Group(); g.position.set(x, 0, zz); siteGroup.add(g);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 12), housing); post.position.y = 1.3; g.add(post);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.08, 16), housing); head.position.y = 2.64; g.add(head);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), Z.wall.spotMat); bulb.position.y = 2.5; g.add(bulb);
        cone(Z.wall, g, 0, 2.45, 0, -1, 2.3, 1.6);
        { const l = light(Z.wall, 'spot', x, 2.55, zz, 30, x, 0, zz + 0.8); l.angle = 1.0; l.penumbra = 0.7; l.distance = 9; l.decay = 1.3; }   // pointed down, away from the glass
    });

    // ---- garden: ground uplights under the trees and palms
    [[-16, 9, 1], [-15, -9, 1], [18.8, -6, 1], [19.0, 22.4, 0], [17.4, 0.2, 0], [-17.5, 21, 0]].forEach(([x, zz, real], i) => {
        const dx = (i % 2 ? 0.7 : -0.7), g = new THREE.Group(); g.position.set(x + dx, 0.05, zz + 0.5); siteGroup.add(g);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 14), housing));
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14), Z.garden.spotMat); lens.position.y = 0.06; g.add(lens);
        cone(Z.garden, g, 0, 0.07, 0, 1, 2.4, 0.7);
        if (real) light(Z.garden, 'spot', x + dx, 0.3, zz + 0.5, 6, x, 4.2, zz);
    });

    // ---- boundary wall lights: shielded lamps on top of the compound wall (wall: x -20..20, z -16..24, 2.2 m high, 0.3 m thick, gate gap x 2..10 in front).
    //      Three instanced meshes (plinth, glowing band, hood) = 3 draw calls for all of them. The band uses the zone's own emissive material, so level / colour /
    //      on-off come from Loxone like every other circuit; coneMat is deliberately unused and z.fx stays empty (no point / spot light), so no light is cast
    //      into the compound.
    {
        const W = { top: 2.2, zf: 24, zb: -16, xl: -20, xr: 20 }, pts = [];
        for (let x = -18; x <= 18; x += 4) pts.push([x, W.zb]);                         // back wall
        for (let zz = -12; zz <= 20; zz += 4) { pts.push([W.xl, zz]); pts.push([W.xr, zz]); }   // side walls
        [-18, -14, -10, -6, -2, 14, 18].forEach(x => pts.push([x, W.zf]));              // front wall, either side of the gate
        const mk = (w, h, d, mat, y) => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d), mat, pts.length); const M4 = new THREE.Matrix4();
            pts.forEach(([x, zz], i) => { M4.makeTranslation(x, W.top + y, zz); m.setMatrixAt(i, M4); }); m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; fenceGroup.add(m); return m; };
        mk(0.24, 0.02, 0.24, housing, 0.01);                // plinth
        mk(0.2, 0.04, 0.2, Z.boundary.spotMat, 0.04);       // glowing band
        mk(0.28, 0.03, 0.28, housing, 0.075);               // hood: overhangs the band
    }

    // ---- roofline LED strip: follows the building's outline (the roof parapet is 0.3 m thick, 0.55 m high, its top edge at LEVEL.ROOF + 0.95). The strip is a 3 cm
    //      band, flush on the outer face, ROOFLINE.drop below the top edge. It uses the zone's rgbwMat, so level / colour / on-off come from Loxone and the Party
    //      scene cycles its colour; no light source is added.
    {
        const pts = worldPoly('F2', PLAN.F2.poly), top = LEVEL.ROOF + 0.4 + 0.55, y = top - ROOFLINE.drop - 0.015, grp = floorGroups.ROOF;
        pts.forEach((a, i) => {
            const b = pts[(i + 1) % pts.length], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz); if (len < 0.2) return;
            const n0 = { x: -dz / len, z: dx / len }, mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
            const s = pointInPoly({ x: mid.x + n0.x * 0.3, z: mid.z + n0.z * 0.3 }, pts) ? -1 : 1;   // the side that faces away from the building
            const m = new THREE.Mesh(new THREE.BoxGeometry(len + 0.3, 0.03, 0.025), Z.roof.rgbwMat);
            m.position.set(mid.x + s * n0.x * 0.1625, y, mid.z + s * n0.z * 0.1625); m.rotation.y = -Math.atan2(dz, dx); grp.add(m);
        });
    }

    // ---- glass facade LED strip: every 'g' / 'G2' edge of the plans has a 0.3 m grey band above the glass (see buildShell). The strip is a 4 cm band flush on its
    //      outer face, centred in the band. Zone rgbwMat again: Loxone level / colour / on-off, Party cycles the colour, no light source.
    ['GF', 'F1', 'F2'].forEach(f => {
        const def = PLAN[f], pts = worldPoly(f, def.poly);
        pts.forEach((a, i) => {
            const type = def.edges[i]; if (type !== 'g' && type !== 'G2') return;
            const b = pts[(i + 1) % pts.length], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
            const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, out = pointInPoly({ x: mid.x + nx * 0.4, z: mid.z + nz * 0.4 }, pts) ? -1 : 1;   // away from the building
            const H = type === 'G2' ? (LEVEL.F2 - LEVEL.GF) : FLOOR_H;
            const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(len - 0.25, 0.1), 0.04, 0.02), Z.glass.rgbwMat);
            m.position.set(mid.x + out * nx * 0.136, LEVEL[f] + H - 0.15, mid.z + out * nz * 0.136); m.rotation.y = -Math.atan2(dz, dx); floorGroups[f].add(m);
        });
    });

    // darkness gating + output: wraps the main script's applyZone() so it works whoever triggers it (sliders, scenes, tablets, Loxone)
    const baseApply = applyZone;
    applyZone = function (z) {
        baseApply(z); if (!z.ext) return;
        const k = zoneLevel(z), dark = (SKY[envKey] && SKY[envKey].dark) ? 1 : 0.12, col = isAlarmActive ? '#ffffff' : z.color;
        z.light.intensity = 0; z.coneMat.opacity = (z.gain || 0.06) * k * (dark === 1 ? 1 : 0.3); z.coneMat.color.set(col); z.spotMat.emissiveIntensity = 0.3 + (z.gain ? 5 : 2.2) * k;
        z.fx.forEach(f => { f.light.intensity = f.base * k * dark; f.light.color.set(col); });
    };
    const baseEnv = applyEnvironment;
    applyEnvironment = function () { baseEnv(); Object.values(EXTL.zones).forEach(applyZone); };
    // scene presets: warm white exterior circuits whatever the interior colour of the scene is
    const baseScene = triggerScene;
    triggerScene = function (mode) {
        baseScene(mode);
        const set = (on, lvl) => Object.values(EXTL.zones).forEach(z => { z.on = on; z.level = lvl; z.color = '#ffd29a'; z.autoUntil = 0; });
        if (mode === 'DUSK') { set(true, 80); Z.wall.level = 100; } else if (mode === 'NIGHT') { set(true, 55); Z.wall.level = 100; } else if (mode === 'DEFAULT') set(false, 80);
        else if (mode === 'PARTY') { Z.roof.on = true; Z.roof.level = 100; Z.glass.on = true; Z.glass.level = 100; Z.wall.on = true; Z.wall.level = 100; Z.wall.color = '#ec4899'; Z.garden.on = true; Z.garden.level = 70; Z.garden.color = '#a855f7'; }
        else if (mode === 'AWAY') { set(false, 40); Z.wall.on = true; Z.wall.level = 60; Z.boundary.on = true; Z.boundary.level = 60; }   // away: perimeter stays lit
        applyAllZones(); syncZoneUI();
    };
    // the hall tablet lists the exterior circuits as well
    if (typeof TAB_ZONES !== 'undefined' && TAB_ZONES.hall) { const h = TAB_ZONES.hall; TAB_ZONES.hall = () => h().concat(Object.keys(EXTL.zones)); }
    buildZoneUI(); syncZoneUI(); applyEnvironment(); applyAllZones();
}
