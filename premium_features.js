/* =====================================================================
   PREMIUM PACKAGE FEATURES ("The Intelligent Estate")
   Adds the Premium-tier features from Loxone_Smart_Home_Packages_Ghana.docx that the base
   simulation did not have. Loaded after the main script and shares its globals (scene, zones,
   SHED, isAlarmActive ...). Entry points: premiumInit() (from window.onload), premiumTick()
   (every frame) and premiumSlowTick() (every 0.5 s), both called from animate().
   All behaviour is simulated; positions of the new site equipment are indicative.
===================================================================== */
const PX = {
    ready: false,
    hcl: { on: false, hour: 14, play: false, cct: 0 },
    clim: { on: true, brand: 'Daikin', floors: {
        GF: { set: 23, temp: 27.5, co2: 520, voc: 90 },
        F1: { set: 23, temp: 28.2, co2: 480, voc: 70 },
        F2: { set: 22, temp: 28.8, co2: 450, voc: 60 } }, vent: {} },
    sec: { beams: true, garageOpen: false, garageT: 0, fails: 0, log: [], alert: null, call: null },
    en: { outage: false, gen: false, genManual: false, lvl: 0, shedPool: false, shedVrf: false },
    water: { over: 85, sump: 70, pump: 'Idle', auto: true, mains: true, lock: false, prime: 0 },
    wx: { wind: 12, rain: false, forecast: 20, perg: 'auto' },
    t3d: {}
};
const px$ = id => document.getElementById(id);
const pxClamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------------------------------------------------------- helpers */
function kelvinHex(k) {
    k /= 100; let r, g, b;
    r = k <= 66 ? 255 : 329.698727446 * Math.pow(k - 60, -0.1332047592);
    g = k <= 66 ? 99.4708025861 * Math.log(k) - 161.1195681661 : 288.1221695283 * Math.pow(k - 60, -0.0755148492);
    b = k >= 66 ? 255 : (k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307);
    const h = v => Math.round(pxClamp(v, 0, 255)).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
}
function hclCct(h) {
    if (h < 6 || h >= 22) return 1800;
    if (h < 12) return 2200 + (h - 6) / 6 * 4300;
    if (h < 18) return 6500 - (h - 12) / 6 * 3500;
    return 3000 - (h - 18) / 4 * 1000;
}
function pxLog(msg) {
    const d = new Date(), ts = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    PX.sec.log.unshift(ts + '  ' + msg); PX.sec.log.length = Math.min(PX.sec.log.length, 7);
    const el = px$('px-log'); if (el) el.innerHTML = PX.sec.log.map(l => `<div>${l}</div>`).join('');
}
let pxAudioCtx = null;
function pxBeep(seq, type = 'sine', gain = 0.12) { // seq: [[freq, startSec, durSec], ...]
    try {
        pxAudioCtx = pxAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const c = pxAudioCtx, t0 = c.currentTime;
        seq.forEach(([f, s, d]) => {
            const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t0 + s); g.gain.exponentialRampToValueAtTime(gain * (typeof audioVolume === 'number' ? Math.max(0.2, audioVolume) : 0.6), t0 + s + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d); o.connect(g); g.connect(c.destination); o.start(t0 + s); o.stop(t0 + s + d + 0.05);
        });
    } catch (e) { /* audio blocked: visual feedback only */ }
}
function pxFlashSpeakers(ms = 3000) { flashType = 'speaker'; flashUntil = performance.now() + ms; }
function pxPresenceSpots() { // one presence sensor per ground-floor room: indicative glass-break sensor positions
    const seen = new Set(), out = [];
    devices.filter(d => d.type === 'presence' && d.floor === 'GF').forEach(d => { const k = d.room || d.id; if (!seen.has(k)) { seen.add(k); out.push(d); } });
    return out.slice(0, 5);
}

/* ---------------------------------------------------------------- 3D */
function premiumBuild3D() {
    const T = PX.t3d, gs = new THREE.Group(); siteGroup.add(gs);
    const dark = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.6, metalness: 0.4 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.4, metalness: 0.7 });

    // ---- garage with sectional door (motorised, linked to intercom / Miniserver)
    const g = new THREE.Group(); g.position.set(13.3, 0, -12.6); gs.add(g);
    const gw = 5.4, gd = 5, gh = 2.9;
    box(gw, gh, 0.25, MAT.brickWall, 0, gh / 2, -gd / 2, g);               // back wall
    box(0.25, gh, gd, MAT.brickWall, -gw / 2, gh / 2, 0, g);               // west wall
    box(0.25, gh, gd, MAT.brickWall, gw / 2, gh / 2, 0, g);                // east wall
    box(gw + 0.4, 0.22, gd + 0.5, MAT.coping, 0, gh + 0.11, 0.1, g);      // flat roof
    box(gw - 0.3, 0.05, gd - 0.3, MAT.dark, 0, 0.03, 0, g);                // floor
    box(gw, 0.5, 0.25, MAT.trav, 0, gh - 0.25, gd / 2, g);             // lintel
    const door = new THREE.Group(); door.position.set(0, gh - 0.5, gd / 2 - 0.05); g.add(door); T.garageDoor = door;
    const dh = gh - 0.5;
    for (let i = 0; i < 5; i++) box(gw - 0.5, dh / 5 - 0.03, 0.07, MAT.slab, 0, -(i + 0.5) * dh / 5, 0, door);
    box(0.4, 0.09, 0.02, MAT.frame, 1.8, -dh / 2, 0.05, door);
    const gled = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 })); gled.position.set(gw / 2 - 0.1, 2.2, gd / 2 + 0.2); g.add(gled); T.garageLed = gled;
    const gl = new THREE.PointLight(0xffe2b0, 0, 6, 1.6); gl.position.set(0, 2.4, 0); g.add(gl); T.garageLight = gl;
    T.garage = g;

    // ---- driveway: asphalt lane from the paving beside the guest pad north to the garage forecourt
    const asph = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.95 }), conc = new THREE.MeshStandardMaterial({ color: 0xbdb8ad, roughness: 0.95 });
    const lineM = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const slabAt = (x0, x1, z0, z1, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), asph); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; gs.add(m); return m; };
    const LX0 = 11.5, LX1 = 14.9, LZ0 = -7.4, LZ1 = 14.2, GX0 = 10.6, GX1 = 16.0, GZ0 = -10.1;
    const lanePieces = [slabAt(LX0, LX1, LZ0, LZ1, 0.022)];                      // main lane, 3.4 m wide, flush with the paving on its west side (road model swaps in)
    slabAt(GX0, GX1, GZ0, LZ0, 0.022);                      // forecourt in front of the garage, full door width plus margin
    box(GX1 - GX0 - 0.4, 0.02, 0.5, conc, (GX0 + GX1) / 2, 0.03, GZ0 + 0.35, gs);   // concrete threshold under the door
    lanePieces.push(box(0.1, 0.006, LZ1 - LZ0, lineM, LX1 - 0.15, 0.028, (LZ0 + LZ1) / 2, gs));       // edge line, east
    lanePieces.push(box(0.1, 0.006, LZ1 - LZ0, lineM, LX0 + 0.15, 0.028, (LZ0 + LZ1) / 2, gs));       // edge line, west
    for (let z = LZ1 - 1; z > LZ0 + 1; z -= 2.2) lanePieces.push(box(0.08, 0.006, 1.1, lineM, (LX0 + LX1) / 2, 0.028, z, gs));   // dashed centre line
    addRoadStrip(gs, LX0, LX1, LZ0, LZ1, 0.03, lanePieces);                          // "Road / Avenue / street" model replaces the asphalt, lines and dashes
    const k = 0.16, kh = 0.15;
    box(k, kh, LZ1 - LZ0, conc, LX1 + k / 2, kh / 2, (LZ0 + LZ1) / 2, gs);           // kerb along the east edge of the lane
    box(k, kh, LZ0 - GZ0, conc, GX1 + k / 2, kh / 2, (LZ0 + GZ0) / 2, gs);           // forecourt kerbs
    box(k, kh, LZ0 - GZ0, conc, GX0 - k / 2, kh / 2, (LZ0 + GZ0) / 2, gs);
    box(GX1 - LX1, kh, k, conc, (GX1 + LX1) / 2, kh / 2, LZ0 + k / 2, gs);
    box(LX0 - GX0, kh, k, conc, (LX0 + GX0) / 2, kh / 2, LZ0 + k / 2, gs);
    for (let i = 0; i < 5; i++) {                                                    // bollard lights along the lane
        const bz = 10 - i * 4.2, bx = LX1 + 0.45;
        addBollard(gs, bx, bz, 0, 0.72, MAT.extGlow, () => {
            const b = box(0.15, 0.7, 0.15, MAT.dark, bx, 0.35, bz, gs);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), MAT.extGlow); cap.position.set(bx, 0.62, bz); gs.add(cap); return [b, cap];
        });
    }
    const grate = new THREE.Mesh(new THREE.PlaneGeometry(GX1 - GX0 - 0.6, 0.18), MAT.frame); grate.rotation.x = -Math.PI / 2; grate.position.set((GX0 + GX1) / 2, 0.036, GZ0 + 0.85); gs.add(grate);   // drain channel
    addLuxuryCar(13.3, -12.7, Math.PI / 2, 0x7a1f1f, 0x7a1f1f);                      // car parked inside, seen when the door opens
    T.driveway = { x0: LX0, x1: LX1, z0: LZ0, z1: LZ1 };

    // ---- VRF / VRV outdoor unit (Modbus gateway to the Miniserver)
    const vrf = new THREE.Group(); vrf.position.set(18.3, 0, -14.3); gs.add(vrf);
    box(1.5, 1.6, 0.85, steel, 0, 0.8, 0, vrf); box(1.6, 0.1, 0.95, dark, 0, 0.05, 0, vrf);
    for (let i = 0; i < 9; i++) box(1.38, 0.025, 0.02, dark, 0, 0.35 + i * 0.12, 0.44, vrf);
    const fan = new THREE.Group(); fan.position.set(0, 1.62, 0); vrf.add(fan); T.vrfFan = fan;
    fan.add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 20), dark).rotateX(Math.PI / 2));
    for (let i = 0; i < 3; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.12), dark); bl.rotation.y = i * Math.PI / 3; fan.add(bl); }
    const vled = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e })); vled.position.set(0.6, 1.3, 0.44); vrf.add(vled); T.vrfLed = vled;

    // ---- standby generator (generator relay on the Loxone DB)
    const gen = new THREE.Group(); gen.position.set(18.3, 0, -12.1); gs.add(gen);
    box(1.6, 1.0, 0.8, new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 }), 0, 0.55, 0, gen); box(1.7, 0.1, 0.9, dark, 0, 0.05, 0, gen);
    box(0.12, 0.55, 0.12, dark, 0.55, 1.3, -0.2, gen);
    const genLed = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x64748b })); genLed.position.set(-0.6, 0.8, 0.42); gen.add(genLed); T.genLed = genLed;
    const gsm = new THREE.PointLight(0xff7a2a, 0, 4, 2); gsm.position.set(0.55, 1.4, -0.2); gen.add(gsm); T.genLight = gsm;

    // ---- video intercom door station at the gate
    const ic = new THREE.Group(); ic.position.set(1.55, 0, 23.55); gs.add(ic);
    box(0.28, 1.5, 0.2, MAT.dark, 0, 0.75, 0, ic);
    const icCv = document.createElement('canvas'); icCv.width = 128; icCv.height = 96; const ig = icCv.getContext('2d');
    ig.fillStyle = '#0b1220'; ig.fillRect(0, 0, 128, 96); ig.fillStyle = '#8dc63f'; ig.font = 'bold 20px Arial'; ig.textAlign = 'center'; ig.fillText('loxone', 64, 36);
    ig.fillStyle = '#e2e8f0'; ig.font = '13px Arial'; ig.fillText('Intercom', 64, 58); ig.fillStyle = '#8dc63f'; ig.beginPath(); ig.arc(64, 78, 7, 0, 7); ig.fill();
    const icScr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(icCv) })); icScr.position.set(0, 1.15, 0.105); ic.add(icScr);
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 })); cam.rotation.x = Math.PI / 2; cam.position.set(0, 1.36, 0.105); ic.add(cam);
    T.intercom = ic;

    // ---- perimeter beams: four sides, two beam heights, 3 m posts
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.55 });
    const beamGroup = new THREE.Group(); gs.add(beamGroup); T.beams = []; T.beamGroup = beamGroup;
    const xl = -19.3, xr = 19.3, zb = -15.3, zf = 23.3;
    const sides = [['North', [xl, zb], [xr, zb]], ['East', [xr, zb], [xr, zf]], ['South', [xr, zf], [xl, zf]], ['West', [xl, zf], [xl, zb]]];
    sides.forEach(([name, a, b]) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(len / 9) + 1, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const mats = [];
        for (let i = 0; i < n; i++) { const f = i / (n - 1); box(0.1, 1.6, 0.1, dark, a[0] + (b[0] - a[0]) * f, 0.8, a[1] + (b[1] - a[1]) * f, beamGroup); }
        [0.5, 1.3].forEach(y => {
            const m = beamMat.clone(), bm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.025, 0.025), m);
            bm.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); bm.rotation.y = -ang; beamGroup.add(bm); mats.push(m);
        });
        T.beams.push({ name, mats, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
    });

    // ---- louvred pergola over the pool deck (wind / rain aware)
    const cols = [[487, 432], [578, 433], [487, 597], [578, 595]].map(([x, y]) => W('GF', x, y));
    const px0 = Math.min(...cols.map(c => c.x)), px1 = Math.max(...cols.map(c => c.x)), pz0 = Math.min(...cols.map(c => c.z)), pz1 = Math.max(...cols.map(c => c.z));
    const topY = LEVEL.GF + FLOOR_H + 0.02, pg = new THREE.Group(); floorGroups.GF.add(pg); T.louvres = [];
    box(px1 - px0 + 0.3, 0.12, 0.12, MAT.frame, (px0 + px1) / 2, topY, pz0, pg); box(px1 - px0 + 0.3, 0.12, 0.12, MAT.frame, (px0 + px1) / 2, topY, pz1, pg);
    box(0.12, 0.12, pz1 - pz0, MAT.frame, px0, topY, (pz0 + pz1) / 2, pg); box(0.12, 0.12, pz1 - pz0, MAT.frame, px1, topY, (pz0 + pz1) / 2, pg);
    const nb = Math.max(6, Math.round((pz1 - pz0) / 0.3)), pitch = (pz1 - pz0) / nb;
    for (let i = 0; i < nb; i++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(px1 - px0 - 0.1, 0.03, pitch * 0.95), MAT.frame);
        bl.position.set((px0 + px1) / 2, topY + 0.04, pz0 + pitch * (i + 0.5)); bl.castShadow = true; pg.add(bl); T.louvres.push(bl);
    }
    T.louvreAng = 1.1;

    // ---- rain
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = -26 + Math.random() * 52; pos[i * 3 + 1] = Math.random() * 16; pos[i * 3 + 2] = -22 + Math.random() * 52; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    T.rain = new THREE.Points(rg, new THREE.PointsMaterial({ size: 0.07, color: 0xbcd6ff, transparent: true, opacity: 0.65, depthWrite: false }));
    T.rain.visible = false; T.rain.frustumCulled = false; scene.add(T.rain);

    // ---- intrusion beacon light
    T.alertLight = new THREE.PointLight(0xff2020, 0, 14, 1.6); scene.add(T.alertLight);
}

/* ---------------------------------------------------------------- per-frame */
function premiumTick(dt, t) {
    if (!PX.ready) return;
    const T = PX.t3d, k = Math.min(1, dt * 3);
    // garage door
    const gTarget = PX.sec.garageOpen ? 0.04 : 1;
    T.garageDoor.scale.y += (gTarget - T.garageDoor.scale.y) * k;
    T.garageLight.intensity += ((PX.sec.garageOpen ? 1.2 : 0) - T.garageLight.intensity) * k;
    T.garageLed.material.color.setHex(PX.sec.garageOpen ? 0x22c55e : 0xef4444);
    // VRF fan
    T.vrfFan.rotation.y += PX.clim.on ? dt * 14 : 0; T.vrfLed.material.color.setHex(PX.clim.on ? 0x22c55e : 0x64748b);
    // generator light
    T.genLed.material.color.setHex(PX.en.gen ? 0x22c55e : 0x64748b); T.genLight.intensity = PX.en.gen ? 0.6 + 0.3 * Math.sin(t * 9) : 0;
    // beams
    T.beamGroup.visible = PX.sec.beams;
    const al = PX.sec.alert && isAlarmActive ? PX.sec.alert : null;
    T.beams.forEach(b => b.mats.forEach(m => { m.opacity = (al && al.beam === b.name) ? (Math.floor(t * 6) % 2 ? 1 : 0.25) : 0.5 + 0.1 * Math.sin(t * 3); m.color.setHex(al && al.beam === b.name ? 0xffffff : 0xff3b30); }));
    // alarm beacon
    pxFxTick(dt, t); if (typeof lkTick === 'function') lkTick(dt, t); if (typeof cineTick === 'function') cineTick(dt, t);
    if (al && al.pos) { T.alertLight.position.set(al.pos.x, al.pos.y, al.pos.z); T.alertLight.intensity = 2 + 2 * Math.sin(t * 10); } else T.alertLight.intensity = 0;
    // pergola louvres
    const closed = PX.wx.perg === 'closed' || (PX.wx.perg === 'auto' && (PX.wx.rain || PX.wx.wind >= 40));
    const open = PX.wx.perg === 'open' && !(PX.wx.wind >= 40) ? 1.1 : (PX.wx.perg === 'auto' && !closed ? 1.1 : 0);
    T.louvreAng += ((closed ? 0 : open) - T.louvreAng) * k; T.louvres.forEach(l => { l.rotation.x = T.louvreAng; });
    // rain
    T.rain.visible = PX.wx.rain;
    if (PX.wx.rain) { const p = T.rain.geometry.attributes.position.array, v = 14 * dt, drift = PX.wx.wind * 0.012 * dt * 4; for (let i = 0; i < p.length; i += 3) { p[i + 1] -= v; p[i] += drift; if (p[i + 1] < 0) { p[i + 1] = 15 + Math.random(); p[i] = -26 + Math.random() * 52; } } T.rain.geometry.attributes.position.needsUpdate = true; }
    // intercom video
    if (PX.sec.call && px$('px-call') && !px$('px-call').classList.contains('hidden')) pxDrawVideo(t);
}

/* ---------------------------------------------------------------- 0.5 s simulation */
function premiumSlowTick() {
    if (!PX.ready) return;
    pxTickHcl(); pxTickClimate(); pxTickEnergy(); pxTickWater(); pxTickWeather(); pxRefreshUI(); if (typeof lkSlowTick === 'function') lkSlowTick();
}
function pxTickHcl() {
    const H = PX.hcl;
    if (H.play) { H.hour = (H.hour + 0.1) % 24; const s = px$('px-hcl-hour'); if (s) s.value = H.hour; }
    if (!H.on) return;
    const cct = Math.round(hclCct(H.hour) / 25) * 25;
    if (cct !== H.cct) { H.cct = cct; const hex = kelvinHex(cct); partyMode = false; Object.values(zones).forEach(z => { z.color = hex; }); applyAllZones(); syncZoneUI(); setVal('all-zones-col', hex); }
}
function pxTickClimate() {
    const C = PX.clim;
    Object.entries(C.floors).forEach(([f, s]) => {
        s.temp += (C.on ? (s.set - s.temp) * 0.06 : (30 - s.temp) * 0.01);
        const vent = C.vent[f];
        s.co2 += vent ? -45 : (450 - s.co2) * 0.02; s.voc += vent ? -28 : (50 - s.voc) * 0.03;
        s.co2 = Math.max(400, s.co2); s.voc = Math.max(20, s.voc);
        if (!vent && (s.co2 > 1000 || s.voc > 500)) { C.vent[f] = true; pxLog(`Air quality ${f}: CO2 ${Math.round(s.co2)} ppm / VOC ${Math.round(s.voc)} ppb - fresh-air boost ON`); }
        else if (vent && s.co2 < 650 && s.voc < 200) { C.vent[f] = false; }
    });
}
function pxTickEnergy() {
    const E = PX.en; if (!SHED.door) return;
    if (E.outage) {
        if (E.gen) SHED.bat = Math.min(100, SHED.bat + 0.7); else SHED.bat = Math.max(15, SHED.bat - 0.45);
        if (!E.gen && SHED.bat <= 25) { E.gen = true; pxLog('SoC 25% - generator relay closed, generator starting'); }
        if (E.gen && !E.genManual && SHED.bat >= 85) { E.gen = false; pxLog('SoC 85% - generator stopped'); }
    } else if (E.gen && !E.genManual) E.gen = false;
    const lvl = !E.outage ? 0 : SHED.bat < 40 ? 2 : SHED.bat < 60 ? 1 : 0;
    if (lvl >= 1 && E.lvl < 1) {
        pxLog('Load shedding tier 1: pool, irrigation, EV charging off');
        if (isEvCharging) toggleEvCharging(); if (isIrrigationActive) toggleIrrigation();
        if (pool.master) { E.shedPool = true; setPoolMaster(false); }
    }
    if (lvl >= 2 && E.lvl < 2) {
        pxLog('Load shedding tier 2: VRF A/C, cinema, audio off');
        if (PX.clim.on) { E.shedVrf = true; PX.clim.on = false; } setCinemaPlayback('stop', true); if (isAudioOn) toggleAudio();
    }
    if (lvl < E.lvl) {
        if (lvl < 2 && E.shedVrf) { PX.clim.on = true; E.shedVrf = false; pxLog('VRF A/C restored'); }
        if (lvl < 1 && E.shedPool) { setPoolMaster(true); E.shedPool = false; pxLog('Pool circuits restored'); }
    }
    E.lvl = lvl;
    const g = px$('shed-grid'); if (g && E.outage) g.innerText = E.gen ? 'Generator' : 'Outage';
}
function pxTickWater() {
    const W_ = PX.water;
    W_.over -= 0.12 + (isIrrigationActive ? 0.55 : 0);
    if (W_.mains) W_.sump = Math.min(100, W_.sump + 0.6);
    if (W_.lock && W_.sump > 25) { W_.lock = false; W_.pump = 'Idle'; pxLog('Sump recovered - pump lockout cleared'); }
    if (W_.auto && !W_.lock && W_.over < 30 && W_.pump !== 'Pumping' && W_.pump !== 'Priming') { W_.pump = 'Priming'; W_.prime = 2; }
    if (W_.pump === 'Priming') { if (W_.sump < 8) { W_.lock = true; W_.pump = 'DRY-RUN LOCKOUT'; pxLog('Dry-run protection: sump empty, pump stopped'); } else if (--W_.prime <= 0) W_.pump = 'Pumping'; }
    else if (W_.pump === 'Pumping') {
        if (W_.sump < 8) { W_.lock = true; W_.pump = 'DRY-RUN LOCKOUT'; pxLog('Dry-run protection: sump empty, pump stopped'); }
        else { W_.over += 1.6; W_.sump -= 1.4; if (W_.over >= 90) { W_.pump = 'Idle'; } }
    }
    W_.over = pxClamp(W_.over, 2, 100); W_.sump = pxClamp(W_.sump, 0, 100); tankTarget = W_.over / 100;
    const set = (id, v) => { const e = px$(id); if (e) e.innerText = v; };
    set('water-tank-text', Math.round(W_.over) + '%'); set('water-live-val', Math.round(W_.over));
    const bar = px$('water-tank-bar'); if (bar) bar.style.width = W_.over + '%';
    const ps = px$('pump-status'); if (ps) { ps.innerText = W_.pump; ps.className = W_.pump === 'Pumping' || W_.pump === 'Priming' ? 'text-cyan-400 animate-pulse font-bold' : W_.lock ? 'text-rose-400 font-bold' : 'text-slate-200'; }
}
function pxTickWeather() {
    const w = PX.wx;
    if ((w.rain) && isIrrigationActive) { toggleIrrigation(); pxLog('Irrigation stopped: rain detected'); }
}

/* ---------------------------------------------------------------- actions */
function pxHclToggle(on) { PX.hcl.on = on; PX.hcl.cct = 0; if (on) pxTickHcl(); pxRefreshUI(); }
function pxHclHour(v) { PX.hcl.hour = +v; PX.hcl.cct = 0; if (PX.hcl.on) pxTickHcl(); pxRefreshUI(); }
function pxHclPlay() { PX.hcl.play = !PX.hcl.play; if (PX.hcl.play && !PX.hcl.on) { px$('px-hcl-on').checked = true; pxHclToggle(true); } pxRefreshUI(); }
function pxIdentify(type) { flashType = type; flashUntil = performance.now() + 3000; if (!markersOn) { markersOn = true; const c = px$('markers-toggle'); if (c) c.checked = true; refreshMarkers(); } if (currentFloor === 'ALL') { xrayOn = true; const x = px$('xray-toggle'); if (x) x.checked = true; refreshMarkers(); } }

function pxClimOn(on) { PX.clim.on = on; PX.en.shedVrf = false; pxLog('VRF system ' + (on ? 'ON' : 'OFF')); pxRefreshUI(); }
function pxClimSet(f, d) { PX.clim.floors[f].set = pxClamp(PX.clim.floors[f].set + d, 17, 28); pxRefreshUI(); }
function pxClimBrand(b) { PX.clim.brand = b; pxLog('VRF gateway profile: ' + b); pxRefreshUI(); }
function pxClimEvent(kind) {
    const f = PX.clim.floors;
    if (kind === 'cook') { f.GF.voc += 650; f.GF.co2 += 250; pxLog('Cooking event: VOC rising on GF'); }
    else { f.F1.co2 += 800; f.F1.temp += 0.8; pxLog('Gathering event: CO2 rising on F1'); }
    pxRefreshUI();
}

function pxGarage(open) { PX.sec.garageOpen = open === undefined ? !PX.sec.garageOpen : open; pxLog('Garage door ' + (PX.sec.garageOpen ? 'opening' : 'closing')); pxRefreshUI(); }
function pxBeams(on) { PX.sec.beams = on; pxLog('Perimeter beams ' + (on ? 'armed' : 'disarmed')); pxRefreshUI(); }
function pxCallAnswer() { if (!PX.sec.call) return; PX.sec.call.answered = true; PX.sec.call.t0 = performance.now(); px$('px-call-state').innerText = 'Connected'; pxLog('Intercom answered on tablet / app'); }
function pxCallOpen() {
    const c = PX.sec.call; if (!c) return;
    if (/gate/i.test(c.station)) { if (!isGateOpen) toggleMainGate(); pxLog('Gate opened from intercom'); }
    else { simulateNFCScan(); pxLog('Front door released from intercom'); }
    pxCallEnd();
}
function pxDrawVideo(t) {
    const cv = px$('px-video'), g = cv.getContext('2d'), w = cv.width, h = cv.height, c = PX.sec.call;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#26364d'); gr.addColorStop(1, '#10151d'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0c1118'; g.fillRect(0, h * 0.72, w, h);
    const sway = Math.sin(t * 1.3) * 3;
    g.fillStyle = '#6b7a90'; g.beginPath(); g.arc(w / 2 + sway, h * 0.38, 15, 0, 7); g.fill();
    g.fillStyle = '#4b5a70'; g.beginPath(); g.moveTo(w / 2 - 34 + sway, h); g.quadraticCurveTo(w / 2 - 30 + sway, h * 0.55, w / 2 + sway, h * 0.54); g.quadraticCurveTo(w / 2 + 30 + sway, h * 0.55, w / 2 + 34 + sway, h); g.fill();
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 22, 1); }
    g.fillStyle = '#ef4444'; g.beginPath(); g.arc(12, 12, 4, 0, 7); g.fill();
    g.fillStyle = '#e2e8f0'; g.font = 'bold 11px Arial'; g.fillText('LIVE  ' + (c ? c.station.toUpperCase() : ''), 22, 16);
    if (c && c.answered) { const s = Math.floor((performance.now() - c.t0) / 1000); px$('px-call-state').innerText = 'Connected ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
}

function pxOutage(on) {
    const E = PX.en; E.outage = on;
    if (on && !E.genManual) { /* auto generator logic handles it */ }
    pxLog(on ? 'GRID OUTAGE - running on inverter/battery' : 'Grid restored');
    if (!on) { E.gen = E.genManual; pxRefreshUI(); }
    pxRefreshUI();
}
function pxGenerator() { const E = PX.en; E.genManual = !E.gen || !E.genManual ? !E.gen : false; E.gen = E.genManual; pxLog('Generator ' + (E.gen ? 'started manually' : 'stopped')); pxRefreshUI(); }

function fillWaterTank() { PX.water.sump = 100; PX.water.over = Math.max(PX.water.over, 40); PX.water.pump = PX.water.lock ? 'Idle' : 'Priming'; PX.water.lock = false; PX.water.prime = 2; pxLog('Manual fill: pump priming'); }
function pxWaterAuto(on) { PX.water.auto = on; }
function pxMains(on) { PX.water.mains = on; pxLog('Mains water supply ' + (on ? 'restored' : 'cut')); pxRefreshUI(); }
function pxDrainSump() { PX.water.sump = 4; PX.water.mains = false; PX.water.over = Math.min(PX.water.over, 25); pxLog('Test: sump emptied, mains off - pump will trip on dry-run'); pxRefreshUI(); }
function pxResetPump() { PX.water.lock = false; PX.water.pump = 'Idle'; pxLog('Pump lockout reset by user'); pxRefreshUI(); }

const _toggleIrrigation = toggleIrrigation;
toggleIrrigation = function () {
    if (!isIrrigationActive && (PX.wx.rain || PX.wx.forecast >= 60)) { pxLog(PX.wx.rain ? 'Irrigation blocked: raining' : `Irrigation skipped: ${PX.wx.forecast}% rain forecast`); pxRefreshUI(); return; }
    if (!isIrrigationActive && PX.water.over < 15) { pxLog('Irrigation blocked: tank low'); return; }
    _toggleIrrigation(); pxRefreshUI();
};
function pxWind(v) { PX.wx.wind = +v; pxRefreshUI(); }
function pxRain(on) { PX.wx.rain = on; if (on) PX.wx.forecast = Math.max(PX.wx.forecast, 80); pxLog(on ? 'Rain detected' : 'Rain stopped'); pxRefreshUI(); }
function pxForecast(v) { PX.wx.forecast = +v; pxRefreshUI(); }
function pxPergola(m) { PX.wx.perg = m; pxRefreshUI(); }

function pxDoorbell() { pxBeep([[784, 0, 0.4], [622, 0.45, 0.6]], 'sine', 0.14); pxFlashSpeakers(); pxLog('Audioserver: doorbell chime on all zones'); }
function pxSirenTest() { const s = []; for (let i = 0; i < 6; i++) s.push([i % 2 ? 660 : 960, i * 0.4, 0.38]); pxBeep(s, 'sawtooth', 0.06); pxFlashSpeakers(); pxLog('Audioserver: siren test (acoustic alarm output)'); }
function pxAnnounce() { pxBeep([[523, 0, 0.2], [659, 0.22, 0.2], [784, 0.44, 0.35]], 'triangle', 0.12); pxFlashSpeakers(); pxLog('Audioserver: announcement tone, all zones'); }

/* ---------------------------------------------------------------- UI */
function pxCard(inner) { return `<div class="glass-card p-3 rounded-xl space-y-2">${inner}</div>`; }
function pxH(t, icon, col) { return `<h4 class="font-bold uppercase tracking-wider text-slate-400 text-[11px]"><i class="fa-solid ${icon} ${col} mr-1.5"></i>${t}</h4>`; }
const pxBtn = (label, fn, id = '') => `<button ${id ? `id="${id}"` : ''} onclick="${fn}" class="tb-btn">${label}</button>`;
const pxRow = (a, b) => `<div class="flex justify-between items-center gap-2"><span class="text-slate-300">${a}</span>${b}</div>`;

function premiumBuildUI() {
    const el = px$('tab-content-estate'), spk = new Set(devices.filter(d => d.type === 'speaker').map(d => d.zone)).size;
    const cnt = t => devices.filter(d => d.type === t).length;
    const glassOpts = PXFX.panes.map((p, i) => `<option value="${i}">${p.label}</option>`).join('');
    el.innerHTML = `
    ${pxCard(`<div class="flex justify-between items-center"><span class="font-bold text-slate-200 text-sm"><i class="fa-solid fa-crown text-amber-400 mr-1.5"></i>Premium package · The Intelligent Estate</span></div>
        <ul class="grid grid-cols-1 gap-0.5 text-[11px] text-slate-300">
            <li><span class="text-emerald-400">&#10003;</span> DALI/DMX + Human Centric Lighting</li>
            <li><span class="text-emerald-400">&#10003;</span> VRF/VRV A/C + CO2/VOC air quality</li>
            <li><span class="text-emerald-400">&#10003;</span> Video intercom, biometrics, glass-break, perimeter beams, garage</li>
            <li><span class="text-emerald-400">&#10003;</span> SoC load shedding + generator relay (Modbus)</li>
            <li><span class="text-emerald-400">&#10003;</span> Audioserver chime / siren output</li>
            <li><span class="text-emerald-400">&#10003;</span> Water tank, pump priming, dry-run protection</li>
            <li><span class="text-emerald-400">&#10003;</span> Wind/rain pergola + rain-aware irrigation</li>
        </ul>
        <p class="text-[10px] text-slate-500">Behaviour is simulated. The new site equipment (garage, VRF unit, generator, intercom, beams, louvres) is indicative and not on the IBS drawings.</p>`)}

    ${pxH('Architectural lighting · DALI / DMX / HCL', 'fa-lightbulb', 'text-amber-300')}
    ${pxCard(`
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div class="bg-slate-900/60 rounded-lg p-2"><b class="text-slate-100">DALI-2 bus</b><br>${cnt('spot') + cnt('pendant')} gear (spots + pendants)<br><span class="text-emerald-400">Online</span></div>
            <div class="bg-slate-900/60 rounded-lg p-2"><b class="text-slate-100">DMX512 universe 1</b><br>${cnt('rgbw')} RGBW runs + pool/landscape<br><span class="text-emerald-400">Online</span></div>
        </div>
        <div class="grid grid-cols-2 gap-2">${pxBtn('Locate DALI spots', "pxIdentify('spot')")}${pxBtn('Locate DMX strips', "pxIdentify('rgbw')")}</div>
        ${pxRow('<b>Human Centric Lighting</b>', '<input type="checkbox" id="px-hcl-on" onchange="pxHclToggle(this.checked)" class="accent-amber-500 h-4 w-4">')}
        <div class="h-2 rounded-full" style="background:linear-gradient(90deg,#ff8a1f,#ffd9a0 30%,#f3f6ff 50%,#ffd9a0 75%,#ff8a1f)"></div>
        <label class="block"><span class="flex justify-between text-[11px] text-slate-400"><span>Time of day <b id="px-hcl-time" class="text-slate-200"></b></span><span id="px-hcl-cct" class="text-amber-300 font-bold"></span></span>
        <input id="px-hcl-hour" type="range" min="0" max="23.9" step="0.1" value="14" oninput="pxHclHour(this.value)" class="w-full accent-amber-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"></label>
        ${pxBtn('Play 24 h day cycle', 'pxHclPlay()', 'px-hcl-play')}
        <p class="text-[10px] text-slate-500">Warm 2200 K at dawn, 6500 K at noon, 2000 K by evening. Overrides the room colours while on.</p>`)}

    ${pxH('Microclimate · VRF/VRV + air quality', 'fa-wind', 'text-sky-300')}
    ${pxCard(`
        ${pxRow('<b>VRF outdoor unit</b> <span class="text-[10px] text-slate-500">Modbus / RS485</span>', '<input type="checkbox" id="px-vrf-on" checked onchange="pxClimOn(this.checked)" class="accent-sky-500 h-4 w-4">')}
        ${pxRow('Protocol profile', `<select id="px-vrf-brand" onchange="pxClimBrand(this.value)" class="bg-slate-900 border border-slate-700 text-slate-200 p-1.5 rounded-lg text-[10px]"><option>Daikin</option><option>Mitsubishi</option><option>LG</option></select>`)}
        <div id="px-clim" class="space-y-1.5"></div>
        <div class="grid grid-cols-2 gap-2">${pxBtn('Simulate cooking (VOC)', "pxClimEvent('cook')")}${pxBtn('Simulate gathering (CO2)', "pxClimEvent('party')")}</div>
        <p class="text-[10px] text-slate-500">Fresh-air boost starts above 1000 ppm CO2 or 500 ppb VOC.</p>`)}

    ${pxH('Estate security', 'fa-shield-halved', 'text-rose-300')}
    ${pxCard(`
        ${pxRow('<b>Video intercom</b>', `<span class="flex gap-1.5">${pxBtn('Gate call', "pxVisitor('Main Gate')")}${pxBtn('Door call', "pxVisitor('Front Door')")}</span>`)}
        ${pxRow('<b>Biometric (front door)</b>', `<span class="flex gap-1.5">${pxBtn('Owner', "pxFingerprint('Owner')")}${pxBtn('Staff', "pxFingerprint('Staff')")}${pxBtn('Unknown', "pxFingerprint('unknown')")}</span>`)}
        ${pxRow('<b>Glass-break detection</b>', `<select id="px-glass-sel" class="bg-slate-900 border border-slate-700 text-slate-200 p-1.5 rounded-lg text-[10px] max-w-[11rem]">${glassOpts}</select>`)}
        ${pxBtn('Simulate glass break', 'pxGlassBreak()')}
        ${pxRow('<b>Perimeter beams</b> <span class="text-[10px] text-slate-500">2 heights, 4 sides</span>', '<input type="checkbox" id="px-beams" checked onchange="pxBeams(this.checked)" class="accent-rose-500 h-4 w-4">')}
        ${pxBtn('Simulate beam break', 'pxBeamBreak()')}
        ${pxRow('<b>Garage door</b> <span id="px-garage-state" class="text-[10px] text-slate-400"></span>', `<span class="flex gap-1.5">${pxBtn('Open / close', 'pxGarage()')}${pxBtn('View', "animateCameraPosition(17,3.6,-3,13.3,1.2,-12)")}</span>`)}
        <p class="text-[10px] text-slate-500">Alarms reuse the Security-tab RESET button. 3 failed fingerprints raise an alert.</p>
        <div id="px-log" class="text-[10px] font-mono text-slate-400 bg-slate-900/60 rounded-lg p-2 min-h-[3rem] space-y-0.5">Event log...</div>`)}

    ${pxH('Energy independence · microgrid', 'fa-car-battery', 'text-yellow-300')}
    ${pxCard(`
        <div class="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-400">
            <div>Grid<br><strong id="px-grid" class="text-xs text-emerald-300">OK</strong></div>
            <div>Battery SoC<br><strong id="px-soc" class="text-xs text-slate-100"></strong></div>
            <div>Generator<br><strong id="px-gen" class="text-xs text-slate-300">Off</strong></div>
        </div>
        <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div id="px-soc-bar" class="bg-emerald-500 h-full rounded-full transition-all" style="width:90%"></div></div>
        <div class="grid grid-cols-2 gap-2">${pxBtn('Simulate grid outage', 'pxOutage(!PX.en.outage)', 'px-outage')}${pxBtn('Generator start / stop', 'pxGenerator()', 'px-genbtn')}</div>
        <div id="px-shed" class="text-[11px] space-y-1"></div>
        <p class="text-[10px] text-slate-500">Tier 1 sheds below 60% SoC, tier 2 below 40%, generator relay closes at 25% and releases at 85%. Outage drains the battery faster than real time.</p>`)}

    ${pxH('Water management', 'fa-faucet-drip', 'text-cyan-300')}
    ${pxCard(`
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div>Overhead tank <b id="px-over" class="text-cyan-300"></b><div class="bg-slate-800 h-2 rounded-full overflow-hidden mt-1"><div id="px-over-bar" class="bg-cyan-500 h-full"></div></div></div>
            <div>Underground sump <b id="px-sump" class="text-sky-300"></b><div class="bg-slate-800 h-2 rounded-full overflow-hidden mt-1"><div id="px-sump-bar" class="bg-sky-500 h-full"></div></div></div>
        </div>
        ${pxRow('Pump: <b id="px-pump" class="text-slate-100"></b>', '<span class="text-[10px] text-slate-500">auto-primes below 30%</span>')}
        ${pxRow('Auto pump control', '<input type="checkbox" id="px-water-auto" checked onchange="pxWaterAuto(this.checked)" class="accent-cyan-500 h-4 w-4">')}
        ${pxRow('Mains supply', '<input type="checkbox" id="px-mains" checked onchange="pxMains(this.checked)" class="accent-cyan-500 h-4 w-4">')}
        <div class="grid grid-cols-2 gap-2">${pxBtn('Test dry-run trip', 'pxDrainSump()')}${pxBtn('Reset pump lockout', 'pxResetPump()')}</div>`)}

    ${pxH('Weather station · pergola + irrigation', 'fa-cloud-rain', 'text-indigo-300')}
    ${pxCard(`
        <label class="block"><span class="flex justify-between text-[11px] text-slate-400"><span>Wind</span><b id="px-wind-v" class="text-slate-200"></b></span>
        <input type="range" min="0" max="80" value="12" oninput="pxWind(this.value)" class="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"></label>
        <label class="block"><span class="flex justify-between text-[11px] text-slate-400"><span>Rain forecast</span><b id="px-fc-v" class="text-slate-200"></b></span>
        <input type="range" min="0" max="100" value="20" oninput="pxForecast(this.value)" class="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"></label>
        ${pxRow('Raining now', '<input type="checkbox" id="px-rain" onchange="pxRain(this.checked)" class="accent-indigo-500 h-4 w-4">')}
        ${pxRow('Pergola louvres <b id="px-perg" class="text-slate-100"></b>', `<span class="flex gap-1.5">${pxBtn('Auto', "pxPergola('auto')")}${pxBtn('Open', "pxPergola('open')")}${pxBtn('Close', "pxPergola('closed')")}</span>`)}
        <p id="px-wx-note" class="text-[10px] text-slate-500"></p>`)}

    ${pxH('Loxone Audioserver', 'fa-music', 'text-purple-300')}
    ${pxCard(`
        <p class="text-[11px] text-slate-300"><b>1 Audioserver + stereo extensions</b> · ${spk} zones · ${cnt('speaker')} ceiling speakers · multi-purpose output</p>
        <div class="grid grid-cols-3 gap-2">${pxBtn('Doorbell chime', 'pxDoorbell()')}${pxBtn('Announce', 'pxAnnounce()')}${pxBtn('Siren test', 'pxSirenTest()')}</div>
        <p class="text-[10px] text-slate-500">Uses the volume slider on the Light &amp; Audio tab. Siren output is also used by the smoke / intrusion alarm.</p>`)}
    `;

    // intercom call overlay
    const call = document.createElement('div');
    call.id = 'px-call'; call.className = 'hidden fixed z-[70] left-1/2 -translate-x-1/2 bottom-20 w-72 rounded-2xl border-2 border-slate-600 bg-slate-950/95 backdrop-blur shadow-2xl text-xs text-slate-200 p-3 space-y-2';
    call.innerHTML = `<div class="flex justify-between items-center"><span><span class="font-extrabold" style="color:#8dc63f">loxone</span> <b id="px-call-title"></b></span><span id="px-call-state" class="text-amber-300 font-bold"></span></div>
        <canvas id="px-video" width="240" height="135" class="w-full rounded-lg bg-black"></canvas>
        <div class="grid grid-cols-3 gap-2"><button onclick="pxCallAnswer()" class="tb-btn">Answer</button><button onclick="pxCallOpen()" class="tb-btn on">Open</button><button onclick="pxCallEnd()" class="tb-btn">Decline</button></div>`;
    document.body.appendChild(call);

    const ban = document.createElement('div');
    ban.id = 'px-banner'; ban.className = 'hidden fixed z-[65] left-1/2 -translate-x-1/2 top-20 w-[22rem] max-w-[92vw] rounded-2xl border-2 border-rose-500 bg-rose-950/90 backdrop-blur shadow-2xl shadow-rose-900/50 p-3 text-xs text-rose-50 animate-pulse';
    ban.innerHTML = '<div class="flex items-center gap-3"><i class="fa-solid fa-triangle-exclamation text-2xl text-rose-400"></i><div class="flex-1"><div id="px-banner-t" class="font-extrabold text-sm"></div><div id="px-banner-s" class="text-rose-200 text-[11px]"></div></div>'
        + '<div class="flex flex-col gap-1"><button onclick="pxAlertView()" class="tb-btn">Show location</button><button onclick="toggleHazardAlarm()" class="tb-btn on">Reset</button></div></div>';
    document.body.appendChild(ban);
}

function pxRefreshUI() {
    const $ = px$, set = (id, v) => { const e = $(id); if (e) e.innerText = v; };
    if (!$('px-hcl-time')) return;
    const H = PX.hcl, hh = Math.floor(H.hour), mm = Math.floor((H.hour - hh) * 60);
    set('px-hcl-time', String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
    set('px-hcl-cct', Math.round(hclCct(H.hour) / 25) * 25 + ' K'); set('px-hcl-play', H.play ? 'Stop day cycle' : 'Play 24 h day cycle');
    if ($('px-vrf-on')) $('px-vrf-on').checked = PX.clim.on;
    if ($('px-hcl-on')) $('px-hcl-on').checked = H.on;
    if ($('px-beams')) $('px-beams').checked = PX.sec.beams;
    $('px-clim').innerHTML = Object.entries(PX.clim.floors).map(([f, s]) => {
        const co = s.co2 > 1000 ? 'text-rose-400' : s.co2 > 800 ? 'text-amber-300' : 'text-emerald-300', vo = s.voc > 500 ? 'text-rose-400' : s.voc > 250 ? 'text-amber-300' : 'text-emerald-300';
        return `<div class="flex items-center justify-between bg-slate-900/60 rounded-lg px-2 py-1.5 text-[11px]"><b class="text-slate-100 w-6">${f}</b>
            <span class="text-slate-300">${s.temp.toFixed(1)}&deg;C</span>
            <span class="flex items-center gap-1"><button onclick="pxClimSet('${f}',-1)" class="px-1.5 rounded bg-slate-800">-</button><b class="text-sky-300">${s.set}&deg;</b><button onclick="pxClimSet('${f}',1)" class="px-1.5 rounded bg-slate-800">+</button></span>
            <span class="${co}">${Math.round(s.co2)} ppm</span><span class="${vo}">${Math.round(s.voc)} ppb</span>${PX.clim.vent[f] ? '<span class="text-cyan-300">FAN</span>' : '<span class="w-6"></span>'}</div>`;
    }).join('');
    set('px-garage-state', PX.sec.garageOpen ? '· open' : '· closed');
    const E = PX.en, soc = Math.round(SHED.bat);
    set('px-soc', soc + '%'); if ($('px-soc-bar')) { $('px-soc-bar').style.width = soc + '%'; $('px-soc-bar').className = 'h-full rounded-full transition-all ' + (soc < 25 ? 'bg-rose-500' : soc < 50 ? 'bg-amber-400' : 'bg-emerald-500'); }
    set('px-grid', E.outage ? 'OUTAGE' : 'OK'); $('px-grid').className = 'text-xs ' + (E.outage ? 'text-rose-400' : 'text-emerald-300');
    set('px-gen', E.gen ? 'Running' : 'Off'); $('px-gen').className = 'text-xs ' + (E.gen ? 'text-emerald-300' : 'text-slate-300');
    set('px-outage', E.outage ? 'Restore grid' : 'Simulate grid outage'); $('px-outage').classList.toggle('on', E.outage);
    const st = (shed, label) => `<div class="flex justify-between"><span class="text-slate-300">${label}</span><b class="${shed ? 'text-rose-400' : 'text-emerald-300'}">${shed ? 'SHED' : 'ON'}</b></div>`;
    $('px-shed').innerHTML = st(E.lvl >= 1, 'Tier 1 · pool, irrigation, EV') + st(E.lvl >= 2, 'Tier 2 · VRF A/C, cinema, audio') + st(false, 'Tier 3 · lighting, Miniserver, security, fridge');
    const w = PX.water;
    set('px-over', Math.round(w.over) + '%'); $('px-over-bar').style.width = w.over + '%';
    set('px-sump', Math.round(w.sump) + '%'); $('px-sump-bar').style.width = w.sump + '%';
    set('px-pump', w.pump); $('px-pump').className = 'font-bold ' + (w.lock ? 'text-rose-400' : w.pump === 'Idle' ? 'text-slate-100' : 'text-cyan-300');
    if ($('px-mains')) $('px-mains').checked = w.mains;
    const X = PX.wx;
    set('px-wind-v', X.wind + ' km/h'); set('px-fc-v', X.forecast + '%');
    if ($('px-rain')) $('px-rain').checked = X.rain;
    const closed = X.perg === 'closed' || (X.perg === 'auto' && (X.rain || X.wind >= 40));
    set('px-perg', closed ? '· closed' : '· open');
    set('px-wx-note', X.wind >= 40 ? 'Wind guard active: louvres locked closed above 40 km/h.' : X.rain ? 'Rain sensor: louvres closed, irrigation locked out.' : X.forecast >= 60 ? 'Rain forecast high: scheduled irrigation will be skipped.' : 'Conditions fine: irrigation and pergola available.');
}

function premiumInit() {
    premiumBuild3D(); pxCollectPanes();
    premiumBuildUI();
    switchTab('devices'); // restyles every tab button, including the Estate one declared in the HTML
    if (typeof lkInit === 'function') lkInit();
    if (typeof cineInit === 'function') cineInit();
    PX.ready = true; pxRefreshUI();
}
