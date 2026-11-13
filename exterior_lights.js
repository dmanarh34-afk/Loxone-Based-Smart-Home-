/* =====================================================================
   EXTERIOR LIGHTING, CONTROLLED BY LOXONE
   One exterior RGBW light circuit, registered as an ordinary Loxone light zone (the same `zones` objects the rooms use), so it is
   dimmed / coloured / switched from the Lighting tab, from the wall tablets, by the Day / Dusk / Night / Party / Away scenes and by
   "All lights on / off", exactly like the interior lights:
     ext-wall     Forecourt lamp posts   two bright lamp posts in front of the building (no lights are mounted on the walls)
     ext-garden   Garden uplights   ground uplights under the trees and palms (no fixtures are mounted on the building walls)
   Light output follows the zone level and colour; the real light sources are only strong when the sky is dark (dusk / night), as a
   Loxone astro / brightness input would do. Loaded after the main script; entry point extLightsInit() (window.onload).
===================================================================== */
const EXTL = { zones: {}, built: false };

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
    const Z = { wall: mkZone('ext-wall', 'Forecourt lamp posts', 'RGBW lamp posts · Dimmer Tree'), garden: mkZone('ext-garden', 'Garden uplights', 'RGBW ground uplights · DMX') };
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
        else if (mode === 'PARTY') { Z.wall.on = true; Z.wall.level = 100; Z.wall.color = '#ec4899'; Z.garden.on = true; Z.garden.level = 70; Z.garden.color = '#a855f7'; }
        else if (mode === 'AWAY') { set(false, 40); Z.wall.on = true; Z.wall.level = 60; }
        applyAllZones(); syncZoneUI();
    };
    // the hall tablet lists the exterior circuits as well
    if (typeof TAB_ZONES !== 'undefined' && TAB_ZONES.hall) { const h = TAB_ZONES.hall; TAB_ZONES.hall = () => h().concat(Object.keys(EXTL.zones)); }
    buildZoneUI(); syncZoneUI(); applyEnvironment(); applyAllZones();
}
