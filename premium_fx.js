/* =====================================================================
   VISIBLE EVENTS for the Estate tab: shattering glass with sound, an intruder figure that walks
   in, a location marker (light beam + ring + label that shows through walls) and an alert banner.
   Every Estate-tab security event goes through pxIntrusion(); pxClearAlert() undoes it all when
   the Security-tab RESET button turns the alarm off. Loaded after premium_features.js, which
   defines PX, pxBeep, pxLog, px$ ... and calls pxFxTick() every frame.
===================================================================== */
const PXFX = { shards: [], glass: null, figure: null, marker: null, visitor: null, siren: null, panes: [], pending: null };
const PX_HOUSE_CENTRE = new THREE.Vector3(3, 0, 1);

function pxRoomNear(f, x, z) {
    let best = null, bd = 1e9;
    devices.forEach(d => { if (d.floor !== f || !d.room) return; const dd = Math.hypot(d.root.position.x - x, d.root.position.z - z); if (dd < bd) { bd = dd; best = d.room; } });
    return best || FLOOR_LABEL[f];
}
function pxCollectPanes() {
    const out = [];
    FLOOR_KEYS.forEach(f => floorGroups[f].traverse(m => {
        if (!m.userData.glassPane || !m.geometry) return;
        m.updateWorldMatrix(true, false);
        const wp = new THREE.Vector3(); m.getWorldPosition(wp);
        const ang = m.rotation.y, dir = new THREE.Vector3(Math.cos(ang), 0, -Math.sin(ang));
        const len = m.geometry.parameters.width, h = m.geometry.parameters.height;
        if (len < 1.2) return;
        const n = new THREE.Vector3(-dir.z, 0, dir.x);
        if (n.dot(new THREE.Vector3(wp.x - PX_HOUSE_CENTRE.x, 0, wp.z - PX_HOUSE_CENTRE.z)) < 0) n.negate();
        out.push({ mesh: m, floor: f, pos: wp, dir, normal: n, len, h, room: pxRoomNear(f, wp.x, wp.z) });
    }));
    const order = { GF: 0, F1: 1, F2: 2, BSMT: 3, ROOF: 4 };
    out.sort((a, b) => order[a.floor] - order[b.floor] || a.room.localeCompare(b.room));
    PXFX.panes = out.slice(0, 16);
    PXFX.panes.forEach(p => { p.label = `${FLOOR_LABEL[p.floor]} · ${p.room} · ${p.len.toFixed(1)} m`; });
}

/* ---- sound: impact thud + noise crash + glass tinkles ---- */
function pxGlassSound() {
    try {
        pxAudioCtx = pxAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const c = pxAudioCtx, t0 = c.currentTime, vol = Math.max(0.35, typeof audioVolume === 'number' ? audioVolume : 0.6);
        const env = (g, s, peak, dur) => { g.gain.setValueAtTime(0.0001, t0 + s); g.gain.exponentialRampToValueAtTime(peak * vol, t0 + s + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + dur); };
        const thud = c.createOscillator(), tg = c.createGain();
        thud.frequency.setValueAtTime(190, t0); thud.frequency.exponentialRampToValueAtTime(55, t0 + 0.14);
        env(tg, 0, 0.5, 0.18); thud.connect(tg); tg.connect(c.destination); thud.start(t0); thud.stop(t0 + 0.25);
        const len = Math.floor(c.sampleRate * 1.1), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
        const src = c.createBufferSource(); src.buffer = buf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400;
        const ng = c.createGain(); env(ng, 0, 0.7, 1.0);
        src.connect(hp); hp.connect(ng); ng.connect(c.destination); src.start(t0);
        for (let i = 0; i < 26; i++) {
            const o = c.createOscillator(), g = c.createGain(), s = 0.05 + Math.random() * 1.5;
            o.type = Math.random() < 0.5 ? 'triangle' : 'sine'; o.frequency.value = 2200 + Math.random() * 5800;
            env(g, s, 0.07 * (1 - s / 2), 0.05 + Math.random() * 0.12); o.connect(g); g.connect(c.destination); o.start(t0 + s); o.stop(t0 + s + 0.3);
        }
    } catch (e) { /* audio blocked: visual only */ }
}
function pxCrackSound() { pxBeep([[3400, 0, 0.03], [2600, 0.04, 0.04], [4200, 0.09, 0.03]], 'square', 0.1); }
function pxSirenStart() {
    clearInterval(PXFX.siren); let n = 0;
    const play = () => { const s = []; for (let i = 0; i < 4; i++) s.push([i % 2 ? 700 : 980, i * 0.4, 0.38]); pxBeep(s, 'sawtooth', 0.05); };
    play();
    PXFX.siren = setInterval(() => { if (!isAlarmActive || ++n > 14) { clearInterval(PXFX.siren); PXFX.siren = null; return; } play(); }, 1600);
}

/* ---- glass crack, then shatter ---- */
function pxCrackTexture(w, h, ix, iy) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.max(128, Math.round(512 * h / w));
    const g = cv.getContext('2d'), W2 = cv.width, H2 = cv.height;
    g.fillStyle = 'rgba(170,205,225,0.22)'; g.fillRect(0, 0, W2, H2);
    const cx = ix * W2, cy = iy * H2; g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + Math.random() * 0.2, r = (0.3 + Math.random() * 0.9) * Math.max(W2, H2);
        let x = cx, y = cy; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1 + Math.random() * 1.6; g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 8; s++) { x += Math.cos(a + (Math.random() - 0.5) * 0.35) * r / 8; y += Math.sin(a + (Math.random() - 0.5) * 0.35) * r / 8; g.lineTo(x, y); }
        g.stroke();
    }
    for (let k = 1; k <= 5; k++) {
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.beginPath();
        for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, r = k * 38 * (0.8 + Math.random() * 0.4); const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
        g.stroke();
    }
    return new THREE.CanvasTexture(cv);
}
function pxJagTexture(w, h) { // jagged glass left clinging to the frame after the shatter
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.max(128, Math.round(512 * h / w));
    const g = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, m = Math.min(W2, H2) * 0.16;
    g.fillStyle = 'rgba(170,205,225,0.5)'; g.beginPath(); g.rect(0, 0, W2, H2);
    g.moveTo(0, 14);
    for (let i = 1; i <= 14; i++) g.lineTo(i / 14 * W2, 6 + Math.random() * m * (i % 2 ? 1 : 0.3));
    for (let i = 1; i <= 10; i++) g.lineTo(W2 - (6 + Math.random() * m * (i % 2 ? 1 : 0.3)), i / 10 * H2);
    for (let i = 1; i <= 14; i++) g.lineTo(W2 - i / 14 * W2, H2 - (6 + Math.random() * m * (i % 2 ? 1 : 0.3)));
    for (let i = 1; i <= 10; i++) g.lineTo(6 + Math.random() * m * (i % 2 ? 1 : 0.3), H2 - i / 10 * H2);
    g.closePath(); g.fill('evenodd');
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.stroke();
    return new THREE.CanvasTexture(cv);
}
const PX_SHARD_GEOS = (() => {
    const a = [];
    for (let i = 0; i < 6; i++) {
        const g = new THREE.BufferGeometry(), s = 0.05 + Math.random() * 0.13;
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, s, 0, 0, s * (0.2 + Math.random() * 0.8), s * (0.6 + Math.random()), 0]), 3));
        g.computeVertexNormals(); a.push(g);
    }
    return a;
})();
let pxShardMat = null;

function pxStartGlassBreak(p) {
    const ix = 0.3 + Math.random() * 0.4, iy = 0.35 + Math.random() * 0.3;
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(p.len, p.h), new THREE.MeshBasicMaterial({ map: pxCrackTexture(p.len, p.h, ix, iy), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    crack.position.copy(p.pos); crack.rotation.y = p.mesh.rotation.y; crack.renderOrder = 5; scene.add(crack);
    PXFX.glass = { pane: p, phase: 'crack', crack, jag: null, hit: { ix, iy } };
    pxCrackSound();
}
function pxShatter() {
    const G = PXFX.glass, p = G.pane; G.phase = 'fall';
    p.mesh.visible = false; scene.remove(G.crack); G.crack.geometry.dispose(); G.crack.material.dispose(); G.crack = null;
    const jag = new THREE.Mesh(new THREE.PlaneGeometry(p.len, p.h), new THREE.MeshBasicMaterial({ map: pxJagTexture(p.len, p.h), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    jag.position.copy(p.pos); jag.rotation.y = p.mesh.rotation.y; jag.renderOrder = 5; scene.add(jag); G.jag = jag;
    pxShardMat = pxShardMat || new THREE.MeshStandardMaterial({ color: 0xcfe8f3, transparent: true, opacity: 0.72, roughness: 0.05, metalness: 0.5, side: THREE.DoubleSide });
    const floorY = p.pos.y - p.h / 2 + 0.02;
    const hit = new THREE.Vector3(p.pos.x + p.dir.x * (G.hit.ix - 0.5) * p.len, p.pos.y + (0.5 - G.hit.iy) * p.h, p.pos.z + p.dir.z * (G.hit.ix - 0.5) * p.len);
    for (let i = 0; i < 170; i++) {
        const m = new THREE.Mesh(PX_SHARD_GEOS[i % 6], pxShardMat), u = (Math.random() - 0.5) * p.len, v = (Math.random() - 0.5) * p.h;
        m.position.set(p.pos.x + p.dir.x * u, p.pos.y + v, p.pos.z + p.dir.z * u);
        m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); m.scale.setScalar(0.6 + Math.random() * 1.1);
        const inward = Math.random() < 0.72 ? -1 : 1, burst = new THREE.Vector3().subVectors(m.position, hit).multiplyScalar(2.2);
        const vel = new THREE.Vector3(p.normal.x * inward * (0.6 + Math.random() * 2.2) + burst.x * 0.35, 1.2 + Math.random() * 2 + burst.y * 0.3, p.normal.z * inward * (0.6 + Math.random() * 2.2) + burst.z * 0.35);
        scene.add(m);
        PXFX.shards.push({ m, vel, spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12), floorY, landed: false, delay: Math.random() * 0.25 });
    }
    pxGlassSound();
}

/* ---- intruder / visitor figure ---- */
function pxMakeFigure(color, torch) {
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 }), skin = new THREE.MeshStandardMaterial({ color: 0x8d6e5a, roughness: 0.9 }), trousers = new THREE.MeshStandardMaterial({ color: 0x14171c });
    const part = (geo, m, x, y, z) => { const mm = new THREE.Mesh(geo, m); mm.position.set(x, y, z); mm.castShadow = true; g.add(mm); return mm; };
    part(new THREE.CylinderGeometry(0.2, 0.17, 0.72, 10), mat, 0, 1.12, 0);
    const legL = part(new THREE.CylinderGeometry(0.08, 0.07, 0.76, 8), trousers, -0.1, 0.38, 0), legR = part(new THREE.CylinderGeometry(0.08, 0.07, 0.76, 8), trousers, 0.1, 0.38, 0);
    part(new THREE.SphereGeometry(0.15, 12, 10), skin, 0, 1.68, 0);
    part(new THREE.SphereGeometry(0.155, 12, 10, 0, 6.3, 0, 1.4), new THREE.MeshStandardMaterial({ color: 0x0b0d10 }), 0, 1.69, 0);
    const armL = part(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 8), mat, -0.28, 1.15, 0), armR = part(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 8), mat, 0.28, 1.15, 0);
    g.userData = { legL, legR, armL, armR };
    if (torch) { const l = new THREE.PointLight(0xfff2d0, 1.1, 7, 1.6); l.position.set(0, 1.2, 0.5); g.add(l); g.userData.torch = l; }
    return g;
}
function pxSpawnIntruder(from, dir, dist, y, floor) {
    pxRemoveFigure();
    const f = pxMakeFigure(0x15181d, true); f.position.set(from.x, y, from.z); f.rotation.y = Math.atan2(dir.x, dir.z); scene.add(f);
    PXFX.figure = { g: f, from: from.clone(), dir: dir.clone(), dist, y, floor, t0: performance.now(), lastPing: 0 };
}
function pxRemoveFigure() { if (PXFX.figure) { scene.remove(PXFX.figure.g); PXFX.figure = null; } }
function pxSetVisitor(pos, face, color = 0x2f5fb0) {
    pxRemoveVisitor(); const f = pxMakeFigure(color, false); f.position.copy(pos); f.rotation.y = face; scene.add(f); PXFX.visitor = f;
}
function pxRemoveVisitor() { if (PXFX.visitor) { scene.remove(PXFX.visitor); PXFX.visitor = null; } }

/* ---- location marker: light beam, pulsing ring, label that shows through walls ---- */
function pxMakeMarker(pos, label, groundY) {
    pxRemoveMarker();
    const g = new THREE.Group(); g.position.set(pos.x, groundY, pos.z);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 16, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 8; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 40), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.renderOrder = 999; g.add(ring);
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 112; const c = cv.getContext('2d');
    c.fillStyle = 'rgba(127,29,29,0.92)'; c.fillRect(4, 4, 632, 104); c.strokeStyle = '#fca5a5'; c.lineWidth = 4; c.strokeRect(4, 4, 632, 104);
    const parts = label.split(' - ');
    c.fillStyle = '#fff'; c.font = 'bold 40px Arial'; c.textAlign = 'center'; c.fillText(parts[0], 320, 50);
    c.fillStyle = '#fecaca'; c.font = '30px Arial'; c.fillText(parts[1] || '', 320, 90);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    sp.scale.set(3.8, 0.66, 1); sp.position.y = 3.6; sp.renderOrder = 1000; g.add(sp);
    scene.add(g); PXFX.marker = { g, ring, beam, sp };
}
function pxRemoveMarker() { if (PXFX.marker) { scene.remove(PXFX.marker.g); PXFX.marker = null; } }
function pxShowBanner(label, sub) {
    const b = px$('px-banner'); if (!b) return;
    px$('px-banner-t').innerText = label; px$('px-banner-s').innerText = sub || ''; b.classList.remove('hidden');
}

/* ---- single entry for every Estate security event ---- */
function pxIntrusion(label, o = {}) {
    if (!isAlarmActive) toggleHazardAlarm();
    const s = px$('alarm-status-txt'); if (s) s.innerText = label.split(' - ')[0];
    const pos = o.pos || { x: 0, y: 1.4, z: 0 };
    PX.sec.alert = { label, pos, beam: o.beam, cam: o.cam, floor: o.floor, t0: performance.now() };
    pxMakeMarker(pos, label, o.groundY !== undefined ? o.groundY : Math.max(0, pos.y - 1.4));
    pxShowBanner(label, o.sub); pxLog('ALARM: ' + label);
    pxSirenStart();
}
function pxAlertView() {
    const a = PX.sec.alert; if (!a || !a.cam) return;
    if (a.floor && currentFloor !== 'ALL' && currentFloor !== a.floor) setFloorFilter(a.floor, true);
    camAnim = null; animateCameraPosition(...a.cam);
}
function pxClearAlert() {
    PX.sec.alert = null; clearInterval(PXFX.siren); PXFX.siren = null;
    pxRemoveMarker(); pxRemoveFigure(); PXFX.pending = null;
    const b = px$('px-banner'); if (b) b.classList.add('hidden');
    const G = PXFX.glass; if (G) { G.pane.mesh.visible = true; if (G.crack) scene.remove(G.crack); if (G.jag) scene.remove(G.jag); PXFX.glass = null; }
    PXFX.shards.forEach(s => scene.remove(s.m)); PXFX.shards.length = 0;
    pxLog('Alarm reset - glass, intruder and markers cleared');
}

/* ---- actions (replace the plain versions in premium_features.js) ---- */
function pxGlassBreak() {
    if (PXFX.glass) { pxLog('A pane is already broken - reset the alarm first'); return; }
    if (!PXFX.panes.length) pxCollectPanes();
    const sel = px$('px-glass-sel'), p = PXFX.panes[sel ? +sel.value : 0] || PXFX.panes[0]; if (!p) return;
    if (currentFloor !== 'ALL' && currentFloor !== p.floor) setFloorFilter(p.floor, true);
    const o = p.normal, cam = [p.pos.x + o.x * 10 + p.dir.x * 3, p.pos.y + 2.6, p.pos.z + o.z * 10 + p.dir.z * 3, p.pos.x, p.pos.y - 0.2, p.pos.z];
    camAnim = null; animateCameraPosition(...cam);
    pxStartGlassBreak(p);
    PXFX.pending = { p, floorY: p.pos.y - p.h / 2, cam, at: performance.now() + 450 };
}
function pxFinishGlassBreak() {
    const { p, floorY, cam } = PXFX.pending; PXFX.pending = null;
    pxShatter();
    pxIntrusion(`GLASS BREAK - ${FLOOR_LABEL[p.floor]}, ${p.room}`, { pos: { x: p.pos.x, y: p.pos.y + 0.8, z: p.pos.z }, groundY: floorY, cam, floor: p.floor, sub: `${p.len.toFixed(1)} m pane forced - intruder entering` });
    pxSpawnIntruder(new THREE.Vector3(p.pos.x + p.normal.x * 1.3, 0, p.pos.z + p.normal.z * 1.3), new THREE.Vector3(-p.normal.x, 0, -p.normal.z), 3.6, floorY, p.floor);
}
function pxBeamBreak() {
    if (!PX.sec.beams) { pxLog('Beams disarmed - no event'); return; }
    if (PXFX.glass || PX.sec.alert) { pxLog('Alarm already active - reset first'); return; }
    const b = PX.t3d.beams[Math.floor(Math.random() * PX.t3d.beams.length)];
    const from = new THREE.Vector3(b.mid[0], 0, b.mid[1]), dir = new THREE.Vector3(0 - from.x, 0, 4 - from.z).normalize();
    const cam = [b.mid[0] - dir.x * 9 + dir.z * 6, 5.5, b.mid[1] - dir.z * 9 - dir.x * 6, b.mid[0], 1, b.mid[1]];
    pxIntrusion('PERIMETER BREACH - ' + b.name + ' boundary', { pos: { x: b.mid[0], y: 1.2, z: b.mid[1] }, beam: b.name, cam, sub: 'Beam interrupted - intruder crossing the garden' });
    camAnim = null; animateCameraPosition(...cam);
    pxSpawnIntruder(from.clone().addScaledVector(dir, -0.8), dir, 12, 0, 'GF');
}
function pxFingerprint(who) {
    const led = scene.getObjectByName('NFC_LED'), ok = who !== 'unknown';
    if (led) { led.material.color.setHex(0x3b82f6); setTimeout(() => led.material.color.setHex(ok ? 0x10b981 : 0xef4444), 700); setTimeout(() => led.material.color.setHex(0x10b981), 2600); }
    const lp = new THREE.Vector3(); if (led) led.getWorldPosition(lp); else lp.set(0.7, LEVEL.GF + 1.3, 9);
    pxSetVisitor(new THREE.Vector3(lp.x - 0.1, LEVEL.GF, lp.z + 1.1), Math.PI, ok ? 0x2f5fb0 : 0x15181d);
    setTimeout(() => { if (!PX.sec.call) pxRemoveVisitor(); }, 3500);
    if (ok) { PX.sec.fails = 0; pxLog(`Fingerprint: ${who} recognised - front door unlocked`); }
    else {
        PX.sec.fails++; pxLog(`Fingerprint: unknown finger rejected (${PX.sec.fails}/3)`);
        if (PX.sec.fails >= 3) {
            PX.sec.fails = 0; const cam = [lp.x + 3, LEVEL.GF + 2.2, lp.z + 6, lp.x, LEVEL.GF + 1.2, lp.z];
            pxIntrusion('ACCESS ATTEMPT - front door', { pos: { x: lp.x, y: lp.y, z: lp.z }, groundY: LEVEL.GF, cam, sub: '3 failed fingerprint scans' });
            camAnim = null; animateCameraPosition(...cam);
        }
    }
    pxBeep(ok ? [[880, 0, 0.12], [1175, 0.14, 0.18]] : [[220, 0, 0.3]], ok ? 'sine' : 'square', 0.08);
    pxRefreshUI();
}
function pxVisitor(station) {
    PX.sec.call = { station, t0: performance.now(), answered: false };
    px$('px-call').classList.remove('hidden'); px$('px-call-title').innerText = 'Visitor at ' + station; px$('px-call-state').innerText = 'Ringing...';
    pxBeep([[784, 0, 0.35], [622, 0.4, 0.5]], 'sine', 0.14); pxFlashSpeakers(3500); pxLog('Intercom call: ' + station);
    if (/gate/i.test(station)) { pxSetVisitor(new THREE.Vector3(2.3, 0, 25.4), Math.PI); camAnim = null; animateCameraPosition(-3, 3.2, 31, 2.3, 1.3, 24.5); }
    else {
        const led = scene.getObjectByName('NFC_LED'), lp = new THREE.Vector3(); if (led) led.getWorldPosition(lp); else lp.set(0.7, 1.3, 9);
        pxSetVisitor(new THREE.Vector3(lp.x - 0.1, LEVEL.GF, lp.z + 1.1), Math.PI); camAnim = null; animateCameraPosition(lp.x + 3, LEVEL.GF + 2, lp.z + 6, lp.x, LEVEL.GF + 1.2, lp.z);
    }
}
function pxCallEnd() { PX.sec.call = null; px$('px-call').classList.add('hidden'); pxRemoveVisitor(); }

/* ---- per-frame update (called from premiumTick) ---- */
function pxFxTick(dt, t) {
    if (PXFX.pending && performance.now() >= PXFX.pending.at) pxFinishGlassBreak();
    const G = PXFX.glass;
    if (G && G.phase === 'crack' && G.crack) G.crack.material.opacity = 0.9 + 0.1 * Math.sin(t * 40);
    PXFX.shards.forEach(s => {
        if (s.landed) return;
        if (s.delay > 0) { s.delay -= dt; return; }
        s.vel.y -= 9.8 * dt; s.m.position.addScaledVector(s.vel, dt);
        s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; s.m.rotation.z += s.spin.z * dt;
        if (s.m.position.y <= s.floorY) {
            s.m.position.y = s.floorY;
            if (Math.abs(s.vel.y) > 1.2) { s.vel.y *= -0.3; s.vel.x *= 0.6; s.vel.z *= 0.6; s.spin.multiplyScalar(0.5); if (Math.random() < 0.08) pxBeep([[3000 + Math.random() * 4000, 0, 0.05]], 'triangle', 0.025); }
            else { s.landed = true; s.m.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.3, 0, Math.random() * 6); }
        }
    });
    const F = PXFX.figure;
    if (F) {
        const el = (performance.now() - F.t0) / 1000, d = Math.min(F.dist, el * 1.1), walking = d < F.dist, u = F.g.userData, sw = walking ? Math.sin(el * 7) * 0.5 : 0;
        F.g.position.set(F.from.x + F.dir.x * d, F.y + (walking ? Math.abs(Math.sin(el * 7)) * 0.04 : 0), F.from.z + F.dir.z * d);
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw * 0.8; u.armR.rotation.x = sw * 0.8;
        if (u.torch) u.torch.intensity = 1 + 0.3 * Math.sin(t * 5);
        if (performance.now() - F.lastPing > 2500) {
            F.lastPing = performance.now();
            let best = null, bd = 3.2;
            devices.forEach(dv => { if (dv.type !== 'presence' || dv.floor !== F.floor) return; const dd = Math.hypot(dv.root.position.x - F.g.position.x, dv.root.position.z - F.g.position.z); if (dd < bd) { bd = dd; best = dv; } });
            if (best) { triggerPresence(best); pxLog('Presence sensor ' + best.id + ' (' + (best.room || '') + ') detects movement'); }
        }
    }
    const M = PXFX.marker;
    if (M) { const k = (t * 1.2) % 1; M.ring.scale.setScalar(1 + k * 5); M.ring.material.opacity = 1 - k; M.beam.material.opacity = 0.25 + 0.15 * Math.sin(t * 8); M.sp.position.y = 3.6 + Math.sin(t * 3) * 0.12; }
    if (!isAlarmActive && !PXFX.pending && !(G && G.phase === 'crack') && (PX.sec.alert || PXFX.glass || PXFX.marker || PXFX.figure)) pxClearAlert();
}
