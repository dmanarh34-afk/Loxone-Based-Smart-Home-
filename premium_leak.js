/* =====================================================================
   WATER LEAK DETECTION: layout + simulation
   Three independent systems, each with its own controller, sensing cable and distance-read location:
     1. nVent Raychem TraceTek: TTDM-128 master panel + TTSIM-1 location modules, TT1000 (water) and
        TT3000 (conductive liquids) cable.
     2. TTK: FG-ALS4 alarm + locating unit (current model of the FG-ALS family, analogue cable, 4 zones)
        and FG-NET digital locating unit (dynamic map, several simultaneous leaks).
     3. RLE Technologies: LD5200 distance-read controller with SeaHawk cable (supervised for breaks).
   Cable routes are indicative (not on the IBS drawings). Behaviour is simulated: a leak at a chosen
   distance along a cable is converted back to the exact point in the building, shown in 3D (puddle,
   drips, beam, label), on the 2D layout and on the controller displays. Loads after premium_fx.js;
   uses PX / pxBeep / pxLog / px$ from premium_features.js.
===================================================================== */
const LK = { ready: false, cables: [], ctrls: {}, leaks: [], sel: 0, view: 'GF', valveOpen: true, autoShut: true, show: true,
             tabOn: false, fx: {}, alarmIv: null, dripIv: null, shutT: null, nextId: 1, listGroup: null };

const LK_SYS = {
    ttdm: { name: 'TraceTek TTDM-128', col: '#14b8a6' },
    als:  { name: 'TTK FG-ALS4',       col: '#f59e0b' },
    net:  { name: 'TTK FG-NET',        col: '#d946ef' },
    rle:  { name: 'RLE LD5200',        col: '#84cc16' }
};

/* ---------------------------------------------------------------- geometry helpers */
const lkIP = (f, ix, iy) => IP(f, ix, iy);
function lkManhattan(pts) { // expand waypoints into right-angle legs (cable follows walls / skirting)
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const a = out[out.length - 1], b = pts[i];
        if (Math.abs(a.x - b.x) > 0.05 && Math.abs(a.z - b.z) > 0.05) out.push({ x: b.x, z: a.z });
        out.push(b);
    }
    return out;
}
function lkLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return L; }
function lkPointAt(c, d) {
    d = Math.max(0, Math.min(c.len, d)); let acc = 0;
    for (let i = 1; i < c.pts.length; i++) {
        const a = c.pts[i - 1], b = c.pts[i], s = Math.hypot(b.x - a.x, b.z - a.z);
        if (d <= acc + s || i === c.pts.length - 1) { const t = s ? (d - acc) / s : 0; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }; }
        acc += s;
    }
    return c.pts[0];
}
function lkRoomAt(c, p) {
    if (c.roomName) return c.roomName;
    const labels = (typeof ROOM_LABELS !== 'undefined' && ROOM_LABELS[c.floor]) || []; let best = null, bd = 1e9;
    labels.forEach(([n, , a, b]) => {
        const w = c.floor === 'BSMT' ? { x: a, z: b } : IP(c.floor, a, b), dd = Math.hypot(w.x - p.x, w.z - p.z);
        if (dd < bd) { bd = dd; best = n; }
    });
    return (best || FLOOR_LABEL[c.floor]) + (bd > 4 ? ' (nearest)' : '');
}
function lkLabelSprite(text, w, h, bg = 'rgba(15,23,42,0.85)', fg = '#e2e8f0') {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = Math.round(256 * h / w); const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = fg; g.font = `bold ${Math.round(cv.height * 0.55)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true })); sp.scale.set(w, h, 1); sp.renderOrder = 998; return sp;
}

/* ---------------------------------------------------------------- build: controllers + cables */
function lkBuild() {
    const baseY = { BSMT: LEVEL.BSMT, GF: LEVEL.GF, F1: LEVEL.F1, F2: LEVEL.F2, SITE: 0 };
    const grp = f => f === 'SITE' ? siteGroup : floorGroups[f];
    LK.listGroup = new THREE.Group(); scene.add(LK.listGroup); // cable layout, toggled as one
    const cabG = {}; ['BSMT', 'GF', 'F1', 'F2', 'SITE'].forEach(f => { cabG[f] = new THREE.Group(); grp(f).add(cabG[f]); });
    LK.cabG = cabG;

    const shed = { x: SHED.cx, z: SHED.cz };
    const poolA = W('GF', 330, 415), poolB = W('GF', 460, 755);
    const px0 = Math.min(poolA.x, poolB.x) - 0.55, px1 = Math.max(poolA.x, poolB.x) + 0.55, pz0 = Math.min(poolA.z, poolB.z) - 0.55, pz1 = Math.max(poolA.z, poolB.z) + 0.55, pzm = (pz0 + pz1) / 2;

    // controllers: position, floor, kind, label
    const ctrlDefs = {
        ttdm:    { f: 'SITE', x: shed.x + 2.2, z: shed.z + 0.2, y: 1.35, label: 'TTDM-128', brand: 'nVent RAYCHEM', col: '#14b8a6', master: true },
        ttsim_gf:{ f: 'GF',   p: lkIP('GF', 500, 238), y: 1.3, label: 'TTSIM-1 #1', brand: 'TraceTek', col: '#14b8a6', small: true },
        ttsim_f1:{ f: 'F1',   p: lkIP('F1', 640, 400), y: 1.3, label: 'TTSIM-1 #2', brand: 'TraceTek', col: '#14b8a6', small: true },
        ttsim_sh:{ f: 'SITE', x: shed.x + 2.2, z: shed.z - 0.7, y: 1.0, label: 'TTSIM-1 #3', brand: 'TraceTek', col: '#14b8a6', small: true },
        als:     { f: 'BSMT', x: 5.45, z: 3.45, y: 1.3, label: 'FG-ALS4', brand: 'TTK', col: '#f59e0b' },
        net:     { f: 'F2',   p: lkIP('F2', 300, 175), y: 1.3, label: 'FG-NET', brand: 'TTK', col: '#d946ef' },
        rle:     { f: 'GF',   x: px1 + 1.0, z: pzm, y: 1.2, label: 'LD5200', brand: 'RLE SeaHawk', col: '#84cc16' }
    };
    Object.entries(ctrlDefs).forEach(([id, d]) => {
        const x = d.p ? d.p.x : d.x, z = d.p ? d.p.z : d.z, g = new THREE.Group(); g.position.set(x, baseY[d.f], z); grp(d.f).add(g);
        const w = d.small ? 0.26 : 0.4, h = d.small ? 0.2 : 0.52;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, d.y, 0.06), MAT.dark); post.position.y = d.y / 2; g.add(post);
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.5 })); body.position.y = d.y + h / 2 - 0.02; body.castShadow = true; g.add(body);
        const cv = document.createElement('canvas'); cv.width = 300; cv.height = Math.round(300 * (h - 0.06) / (w - 0.04)); const tex = new THREE.CanvasTexture(cv);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.04, h - 0.06), new THREE.MeshBasicMaterial({ map: tex })); scr.position.set(0, body.position.y, 0.062); g.add(scr);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e })); led.position.set(w / 2 - 0.03, body.position.y + h / 2 - 0.03, 0.07); g.add(led);
        const lab = lkLabelSprite(d.label, 0.7, 0.18); lab.position.set(0, d.y + h + 0.2, 0); g.add(lab);
        LK.ctrls[id] = { id, def: d, g, cv, tex, led, small: !!d.small, alarm: false, lines: [], pos: { x, z }, floor: d.f };
    });

    // valve actuator (Loxone relay on the main water supply), next to the TTDM cabinet
    const vg = new THREE.Group(); vg.position.set(shed.x + 2.2, 0, shed.z + 1.2); siteGroup.add(vg);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 })); pipe.rotation.z = Math.PI / 2; pipe.position.y = 0.45; vg.add(pipe);
    const vb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1f2937 })); vb.position.y = 0.45; vg.add(vb);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: 0x22c55e })); lever.position.y = 0.62; vg.add(lever);
    const vl = lkLabelSprite('Main water valve', 1.1, 0.22); vl.position.set(0, 1.0, 0); vg.add(vl);
    LK.fx.lever = lever; LK.fx.valveG = vg;

    // cables
    const mk = (id, sys, ctrls, cable, label, floor, wps, color, o = {}) => {
        const pts = lkManhattan(wps), c = Object.assign({ id, sys, ctrls, cable, label, floor, pts, len: lkLen(pts), color, y: baseY[floor] + (o.dy !== undefined ? o.dy : 0.07), group: cabG[floor] }, o);
        LK.cables.push(c); return c;
    };
    const G = lkIP;
    mk('tt-gf', 'ttdm', ['ttdm', 'ttsim_gf'], 'TT1000 (water)', 'TTSIM-1 #1 · Ground-floor wet areas', 'GF', [G('GF', 500, 238), G('GF', 497, 100), G('GF', 650, 135), G('GF', 842, 70), G('GF', 950, 160), G('GF', 880, 362), G('GF', 845, 462)], 0x14b8a6);
    mk('tt-f1', 'ttdm', ['ttdm', 'ttsim_f1'], 'TT1000 (water)', 'TTSIM-1 #2 · First-floor bathrooms', 'F1', [G('F1', 640, 400), G('F1', 505, 185), G('F1', 735, 215), G('F1', 1085, 150), G('F1', 1300, 170), G('F1', 1140, 470)], 0x2dd4bf);
    mk('tt-sh', 'ttdm', ['ttdm', 'ttsim_sh'], 'TT3000 (conductive liquids)', 'TTSIM-1 #3 · Inverter shed battery bay', 'SITE',
        [{ x: shed.x + 1.9, z: shed.z + 0.1 }, { x: shed.x + 1.35, z: shed.z + 0.1 }, { x: shed.x + 1.35, z: shed.z + 1.0 }, { x: shed.x - 1.35, z: shed.z + 1.0 }, { x: shed.x - 1.35, z: shed.z - 1.0 }, { x: shed.x + 1.35, z: shed.z - 1.0 }, { x: shed.x + 1.35, z: shed.z - 0.2 }], 0xa78bfa, { dy: 0.1, roomName: 'Inverter & DB shed (battery bay)' });
    mk('als-b', 'als', ['als'], 'FG-ECS analogue cable', 'FG-ALS4 · Basement (4 zones)', 'BSMT', [{ x: 5.57, z: 3.67 }, { x: 5.65, z: 0.15 }, { x: 0.1, z: 0.25 }, { x: 2.6, z: -1.85 }], 0xf59e0b, { zones: 4 });
    mk('net-f2', 'net', ['net'], 'FG digital sense cable', 'FG-NET · Second floor + polytank', 'F2', [G('F2', 230, 170), G('F2', 285, 75), G('F2', 60, 150), G('F2', 230, 470), G('F2', 400, 760)], 0xd946ef);
    mk('rle-p', 'rle', ['rle'], 'SeaHawk cable', 'LD5200 · Pool & plunge-pool plant', 'GF',
        [{ x: px1 + 0.7, z: pzm }, { x: px1, z: pzm }, { x: px1, z: pz0 }, { x: px0, z: pz0 }, { x: px0, z: pz1 }, { x: px1, z: pz1 }, { x: px1, z: pzm + 0.8 }], 0x84cc16, { dy: 0.1, roomName: 'Pool deck' });

    // draw cable layout
    LK.cables.forEach(c => {
        const mat = new THREE.MeshBasicMaterial({ color: c.color }); c.mat = mat;
        for (let i = 1; i < c.pts.length; i++) {
            const a = c.pts[i - 1], b = c.pts[i], len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.01) continue;
            const m = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len, 6), mat);
            m.position.set((a.x + b.x) / 2, c.y, (a.z + b.z) / 2); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); m.renderOrder = 4; c.group.add(m);
        }
        for (let d = 5; d < c.len; d += 5) { // distance ticks every 5 m, label every 10 m
            const p = lkPointAt(c, d), t = new THREE.Mesh(new THREE.SphereGeometry(d % 10 === 0 ? 0.075 : 0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); t.position.set(p.x, c.y + 0.03, p.z); c.group.add(t);
            if (d % 10 === 0) { const s = lkLabelSprite(d + ' m', 0.42, 0.18, 'rgba(15,23,42,0.8)', '#fff'); s.position.set(p.x, c.y + 0.3, p.z); c.group.add(s); }
        }
        c.group.visible = LK.show;
    });
    LK.fx.probe = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true }));
    LK.fx.probe.rotation.x = Math.PI / 2; LK.fx.probe.renderOrder = 999; LK.fx.probe.visible = false; scene.add(LK.fx.probe);
}

/* ---------------------------------------------------------------- controller displays */
function lkDrawCtrl(c) {
    const g = c.cv.getContext('2d'), w = c.cv.width, h = c.cv.height, d = c.def, al = c.alarm, lines = c.lines;
    g.fillStyle = al ? '#450a0a' : '#0b1220'; g.fillRect(0, 0, w, h);
    g.fillStyle = d.col; g.fillRect(0, 0, w, 6);
    g.fillStyle = '#cbd5e1'; g.font = `bold ${c.small ? 26 : 22}px Arial`; g.textAlign = 'left'; g.fillText(d.label, 12, 40);
    g.fillStyle = '#64748b'; g.font = '16px Arial'; g.fillText(d.brand, 12, 62);
    g.fillStyle = al ? '#ef4444' : '#22c55e'; g.font = `bold ${c.small ? 34 : 36}px Arial`; g.fillText(al ? 'LEAK' : 'NORMAL', 12, 108);
    g.fillStyle = '#e2e8f0'; g.font = '17px monospace'; (c.small ? lines.slice(0, 2) : lines.slice(0, 5)).forEach((t, i) => g.fillText(t, 12, 136 + i * 22));
    c.tex.needsUpdate = true;
}
function lkCtrlLines(l, c) {
    const d = l.d, ft = d * 3.28084, room = l.room;
    if (l.kind === 'break') return ['CABLE BREAK', d.toFixed(1) + ' m', room];
    switch (c.sys) {
        case 'ttdm': return [c.cable.split(' ')[0] + ' · ' + c.label.split(' · ')[0], 'Dist ' + d.toFixed(1) + ' m', room];
        case 'als': { const z = Math.min(c.zones, Math.floor(d / (c.len / c.zones)) + 1); return ['ZONE ' + z + ' ALARM', 'Dist ≈' + Math.round(d) + ' m', room]; }
        case 'net': return ['Dist ' + d.toFixed(1) + ' m (±1 m)', 'Map location shown', room];
        default: return [Math.round(ft) + ' ft / ' + d.toFixed(1) + ' m', 'SeaHawk', room];
    }
}
function lkUpdateCtrls() {
    Object.values(LK.ctrls).forEach(k => { k.alarm = false; k.lines = []; });
    LK.leaks.forEach(l => { const c = LK.cables[l.cableIdx]; c.ctrls.forEach(id => { const k = LK.ctrls[id]; k.alarm = true; k.lines = k.lines.concat(lkCtrlLines(l, c)); }); });
    Object.values(LK.ctrls).forEach(lkDrawCtrl);
    // text mirror in the panel
    const box = document.getElementById('lk-displays'); if (!box) return;
    const ids = ['ttdm', 'als', 'net', 'rle'];
    box.innerHTML = ids.map(id => { const k = LK.ctrls[id];
        return `<div class="rounded-lg p-2 font-mono text-[10px] leading-4 ${k.alarm ? 'bg-rose-950/70 border border-rose-600 text-rose-100' : 'bg-slate-900/70 border border-slate-700 text-slate-300'}">
            <div class="font-bold" style="color:${k.def.col}">${k.def.label}</div><div class="${k.alarm ? 'text-rose-400 font-bold' : 'text-emerald-400'}">${k.alarm ? 'LEAK' : 'NORMAL'}</div>${k.lines.slice(0, 6).map(t => `<div>${t}</div>`).join('') || '<div class="text-slate-500">Cable OK</div>'}</div>`; }).join('');
}

/* ---------------------------------------------------------------- sound + leak effects */
function lkPlop() {
    try {
        pxAudioCtx = pxAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const c = pxAudioCtx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(), f0 = 700 + Math.random() * 500;
        o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.35, t0 + 0.09);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.14);
    } catch (e) { /* audio blocked */ }
}
function lkStartSounds() {
    clearInterval(LK.alarmIv); clearInterval(LK.dripIv);
    const alarm = () => pxBeep([[1250, 0, 0.16], [950, 0.2, 0.16], [1250, 0.4, 0.16]], 'triangle', 0.1);
    alarm(); LK.alarmIv = setInterval(() => { if (!LK.leaks.length) { clearInterval(LK.alarmIv); return; } alarm(); }, 2400);
    LK.dripIv = setInterval(() => { if (!LK.leaks.length) { clearInterval(LK.dripIv); return; } if (Math.random() < 0.8) lkPlop(); }, 520);
}
function lkMakeMarker(l) {
    const g = new THREE.Group(); g.position.set(l.pos.x, l.pos.y, l.pos.z);
    const col = l.kind === 'break' ? 0xf59e0b : 0x38bdf8, hex = l.kind === 'break' ? '#f59e0b' : '#0ea5e9';
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.y = 6; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 36), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.renderOrder = 999; g.add(ring);
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 150; const c = cv.getContext('2d');
    c.fillStyle = hex; c.globalAlpha = 0.94; c.fillRect(4, 4, 632, 142); c.globalAlpha = 1; c.strokeStyle = '#e0f2fe'; c.lineWidth = 4; c.strokeRect(4, 4, 632, 142);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = 'bold 44px Arial'; c.fillText((l.kind === 'break' ? 'CABLE BREAK ' : 'WATER LEAK ') + 'L' + l.id, 320, 52);
    c.font = '30px Arial'; c.fillText(l.room, 320, 92); c.font = 'bold 28px Arial'; c.fillText(`${l.d.toFixed(1)} m on ${l.sysName}`, 320, 130);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true })); sp.scale.set(4.2, 0.98, 1); sp.position.y = 2.9; sp.renderOrder = 1000; g.add(sp);
    scene.add(g); return { g, ring, beam, sp };
}
function lkMakeFx(l) {
    const fx = { marker: lkMakeMarker(l) };
    if (l.kind === 'leak') {
        const pud = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.012, 40), new THREE.MeshStandardMaterial({ color: 0x3aa0f0, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.3 }));
        pud.position.set(l.pos.x, l.pos.y + 0.012, l.pos.z); pud.scale.set(0.15, 1, 0.15); scene.add(pud); fx.puddle = pud;
        const rip = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); rip.rotation.x = -Math.PI / 2; rip.position.set(l.pos.x, l.pos.y + 0.03, l.pos.z); scene.add(rip); fx.ripple = rip;
        const n = 26, arr = new Float32Array(n * 3), top = l.pos.y + (l.floor === 'SITE' || l.roomName ? 1.6 : 2.4);
        for (let i = 0; i < n; i++) { arr[i * 3] = l.pos.x + (Math.random() - 0.5) * 0.12; arr[i * 3 + 1] = l.pos.y + Math.random() * (top - l.pos.y); arr[i * 3 + 2] = l.pos.z + (Math.random() - 0.5) * 0.12; }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        fx.drips = new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.07, color: 0x7dd3fc, transparent: true, opacity: 0.9, depthWrite: false })); fx.drips.frustumCulled = false; fx.top = top; scene.add(fx.drips);
    }
    return fx;
}
function lkRemoveFx(l) {
    const fx = l.fx; if (!fx) return;
    [fx.marker && fx.marker.g, fx.puddle, fx.ripple, fx.drips].forEach(o => { if (o) scene.remove(o); }); l.fx = null;
}

/* ---------------------------------------------------------------- actions */
function lkSpawn(cableIdx, d, kind = 'leak') {
    const c = LK.cables[cableIdx], p = lkPointAt(c, d), l = { id: LK.nextId++, cableIdx, d: Math.max(0, Math.min(c.len, d)), kind, floor: c.floor, pos: { x: p.x, y: c.y - 0.04, z: p.z }, room: lkRoomAt(c, p), sysName: LK_SYS[c.sys].name, t0: performance.now() };
    LK.leaks.push(l); l.fx = lkMakeFx(l);
    pxLog(`${kind === 'break' ? 'CABLE BREAK' : 'LEAK'} L${l.id}: ${l.sysName} · ${c.cable} · ${l.d.toFixed(1)} m · ${l.room}`);
    lkUpdateCtrls(); lkBanner(); lkStartSounds(); lkSetChip(true);
    if (LK.autoShut && kind === 'leak' && !LK.shutT) LK.shutT = setTimeout(() => { LK.shutT = null; lkValve(false, 'auto shut-off by Miniserver'); }, 3000);
    // fly the camera to the leak and show its floor
    if (currentFloor !== 'ALL' && !(c.floor === 'SITE' || c.floor === currentFloor)) setFloorFilter(c.floor, true);
    LK.view = c.floor; camAnim = null;
    const off = c.floor === 'SITE' ? [3.2, 2.6, 4] : [2.4, 2.2, 3.2];
    animateCameraPosition(l.pos.x + off[0], l.pos.y + off[1], l.pos.z + off[2], l.pos.x, l.pos.y + 0.3, l.pos.z);
    lkRefresh();
}
function lkSimulate() { lkSpawn(LK.sel, LK.slider !== undefined ? LK.slider : 0, 'leak'); }
function lkRandomLeak() { const i = Math.floor(Math.random() * LK.cables.length), c = LK.cables[i]; LK.sel = i; LK.slider = +(Math.random() * c.len).toFixed(1); lkSpawn(i, LK.slider, 'leak'); }
function lkBreakTest() { lkSpawn(LK.sel, LK.slider, 'break'); }
function lkValve(open, why) { LK.valveOpen = open; pxLog('Main water valve ' + (open ? 'OPEN' : 'CLOSED') + (why ? ' (' + why + ')' : '')); if (!open) { PX.water.auto = false; PX.water.pump = 'Idle'; if (isIrrigationActive) toggleIrrigation(); } else PX.water.auto = true; lkRefresh(); }
function lkAutoShut(on) { LK.autoShut = on; }
function lkReset() {
    LK.leaks.forEach(lkRemoveFx); LK.leaks.length = 0; clearInterval(LK.alarmIv); clearInterval(LK.dripIv); clearTimeout(LK.shutT); LK.shutT = null;
    if (!LK.valveOpen) lkValve(true, 'reset'); lkUpdateCtrls(); lkBanner(); lkSetChip(false); pxLog('Leak alarm reset, system normal'); lkRefresh();
}
function lkShowLocation() {
    const l = LK.leaks[LK.leaks.length - 1]; if (!l) return; const c = LK.cables[l.cableIdx];
    if (currentFloor !== 'ALL' && !(c.floor === 'SITE' || c.floor === currentFloor)) setFloorFilter(c.floor, true);
    camAnim = null; animateCameraPosition(l.pos.x + 2.4, l.pos.y + 2.2, l.pos.z + 3.2, l.pos.x, l.pos.y + 0.3, l.pos.z);
}
function lkSetChip(on) {
    if (isAlarmActive) return; const t = document.getElementById('alarm-status-txt'), i = document.getElementById('alarm-icon');
    if (t) t.innerText = on ? 'WATER LEAK' : 'Normal'; if (i) i.className = on ? 'fa-solid fa-droplet text-sky-400 animate-bounce' : 'fa-solid fa-shield-halved';
}
function lkBanner() {
    const b = document.getElementById('lk-banner'); if (!b) return;
    if (!LK.leaks.length) { b.classList.add('hidden'); return; }
    const l = LK.leaks[LK.leaks.length - 1];
    document.getElementById('lk-banner-t').innerText = (l.kind === 'break' ? 'CABLE BREAK' : 'WATER LEAK') + ' L' + l.id + ' · ' + l.room;
    document.getElementById('lk-banner-s').innerText = `${l.sysName}: ${l.d.toFixed(1)} m along cable` + (LK.leaks.length > 1 ? ` · ${LK.leaks.length} active` : '') + (LK.valveOpen ? '' : ' · valve closed');
    b.classList.remove('hidden');
}

/* ---------------------------------------------------------------- 2D layout */
function lkFloorPoly(f) { return f === 'SITE' ? worldPoly('GF', PLAN.GF.poly) : worldPoly(f, PLAN[f].poly); }
function lkDraw2D() {
    const cv = document.getElementById('lk-canvas'); if (!cv) return; const g = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, f = LK.view;
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, W2, H2);
    let b; if (f === 'SITE') b = [-20, 20, -16, 24]; else { const p = lkFloorPoly(f), xs = p.map(a => a.x), zs = p.map(a => a.z); b = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...zs) - 1, Math.max(...zs) + 1]; }
    const s = Math.min((W2 - 16) / (b[1] - b[0]), (H2 - 16) / (b[3] - b[2])), ox = (W2 - s * (b[1] - b[0])) / 2, oz = (H2 - s * (b[3] - b[2])) / 2;
    const X = x => ox + (x - b[0]) * s, Z = z => oz + (z - b[2]) * s;
    if (f === 'SITE') { g.strokeStyle = '#334155'; g.lineWidth = 2; g.strokeRect(X(-20), Z(-16), 40 * s, 40 * s); }
    const poly = lkFloorPoly(f); g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))); g.closePath();
    g.fillStyle = f === 'SITE' ? '#1e293b' : '#162033'; g.fill(); g.strokeStyle = '#64748b'; g.lineWidth = 2; g.stroke();
    if (f !== 'SITE') { g.fillStyle = '#64748b'; g.font = '9px Arial'; g.textAlign = 'center'; ((typeof ROOM_LABELS !== 'undefined' && ROOM_LABELS[f]) || []).forEach(([n, , a, bb]) => { const w = f === 'BSMT' ? { x: a, z: bb } : IP(f, a, bb); g.fillText(n, X(w.x), Z(w.z) - 6); }); }
    if (f === 'SITE') { const sh = SHED; g.fillStyle = '#475569'; g.fillRect(X(sh.cx - sh.w / 2), Z(sh.cz - sh.d / 2), sh.w * s, sh.d * s); g.fillStyle = '#94a3b8'; g.font = '9px Arial'; g.textAlign = 'center'; g.fillText('Shed', X(sh.cx), Z(sh.cz) - 8 * 1); }
    LK.cables.forEach((c, i) => {
        const vis = c.floor === f || (f === 'SITE' && (c.floor === 'SITE' || c.floor === 'GF' && c.id === 'rle-p'));
        if (!vis) return;
        g.strokeStyle = '#' + c.color.toString(16).padStart(6, '0'); g.lineWidth = i === LK.sel ? 4 : 2.4; g.globalAlpha = i === LK.sel ? 1 : 0.75; g.beginPath();
        c.pts.forEach((p, k) => k ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z))); g.stroke(); g.globalAlpha = 1;
        g.fillStyle = '#fff'; g.font = '8px Arial'; g.textAlign = 'center'; for (let d = 10; d < c.len; d += 10) { const p = lkPointAt(c, d); g.fillText(d, X(p.x) + 6, Z(p.z) - 3); g.fillRect(X(p.x) - 1.5, Z(p.z) - 1.5, 3, 3); }
    });
    Object.values(LK.ctrls).forEach(k => { const vis = k.floor === f || (f === 'SITE' && (k.floor === 'SITE' || k.id === 'rle')); if (!vis) return;
        g.fillStyle = k.alarm ? '#ef4444' : k.def.col; g.fillRect(X(k.pos.x) - 5, Z(k.pos.z) - 5, 10, 10); g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(X(k.pos.x) - 5, Z(k.pos.z) - 5, 10, 10);
        g.fillStyle = '#e2e8f0'; g.font = 'bold 8px Arial'; g.textAlign = 'left'; g.fillText(k.def.label, X(k.pos.x) + 8, Z(k.pos.z) + 3); });
    // probe: where a leak at the slider position would be
    const sc = LK.cables[LK.sel];
    if (sc && (sc.floor === f || (f === 'SITE' && (sc.floor === 'SITE' || sc.id === 'rle-p')))) { const p = lkPointAt(sc, LK.slider || 0); g.strokeStyle = '#facc15'; g.lineWidth = 2; g.beginPath(); g.arc(X(p.x), Z(p.z), 7, 0, 7); g.stroke(); }
    const t = performance.now() / 1000;
    LK.leaks.forEach(l => { const c = LK.cables[l.cableIdx]; if (!(c.floor === f || (f === 'SITE' && (c.floor === 'SITE' || c.id === 'rle-p')))) return;
        const k = (t * 1.5) % 1, col = l.kind === 'break' ? '245,158,11' : '239,68,68';
        g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 2; g.beginPath(); g.arc(X(l.pos.x), Z(l.pos.z), 6 + k * 16, 0, 7); g.stroke();
        g.fillStyle = `rgb(${col})`; g.beginPath(); g.arc(X(l.pos.x), Z(l.pos.z), 5, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = 'bold 10px Arial'; g.textAlign = 'left'; g.fillText(`L${l.id} ${l.d.toFixed(1)} m`, X(l.pos.x) + 9, Z(l.pos.z) - 8); });
}

/* ---------------------------------------------------------------- panel UI */
function lkUI() {
    const el = document.getElementById('tab-content-leak'); if (!el) return;
    const card = i => `<div class="glass-card p-3 rounded-xl space-y-2">${i}</div>`;
    const sysRows = [
        ['TraceTek', '#14b8a6', 'TTDM-128 master panel + TTSIM-1 location modules; TT1000 (water) and TT3000 (conductive liquids) sensing cable. Datasheet: up to 1500 m of cable direct and up to 127 remote modules.'],
        ['TTK FG-ALS4', '#f59e0b', 'Alarm + locating unit, 4 zones, analogue FG-ECS cable (FG-ALS is discontinued; FG-ALS4 is its successor).'],
        ['TTK FG-NET', '#d946ef', 'Digital locating unit: dynamic map, location to about ±1 m, detects simultaneous leaks.'],
        ['RLE LD5200', '#84cc16', 'Distance-read controller + SeaHawk cable. Supervises for breaks and disconnects (end-of-line terminator); needs at least 10.7 m of cable.']];
    el.innerHTML = `
    ${card(`<div class="font-bold text-slate-200 text-sm"><i class="fa-solid fa-droplet text-sky-400 mr-1.5"></i>Water leak detection &amp; location</div>
        ${sysRows.map(r => `<div class="text-[11px]"><b style="color:${r[1]}">${r[0]}</b> <span class="text-slate-400">${r[2]}</span></div>`).join('')}
        <p class="text-[10px] text-slate-500">Cable routes and cabinet positions are indicative, not on the IBS drawings. Spec notes come from manufacturer datasheets; confirm part numbers and approvals before ordering.</p>`)}
    ${card(`<div class="flex justify-between items-center"><b class="text-slate-200">Cable layout</b><label class="text-[11px] text-slate-300 flex items-center gap-1.5">Show in 3D <input type="checkbox" id="lk-show" checked onchange="lkShowCables(this.checked)" class="accent-sky-500 h-4 w-4"></label></div>
        <div id="lk-floors" class="grid grid-cols-5 gap-1"></div>
        <canvas id="lk-canvas" width="340" height="270" class="w-full rounded-lg border border-slate-700"></canvas>
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
            <span><i class="inline-block w-3 h-1 align-middle" style="background:#14b8a6"></i> TT1000</span><span><i class="inline-block w-3 h-1 align-middle" style="background:#a78bfa"></i> TT3000</span>
            <span><i class="inline-block w-3 h-1 align-middle" style="background:#f59e0b"></i> FG-ECS</span><span><i class="inline-block w-3 h-1 align-middle" style="background:#d946ef"></i> FG digital</span>
            <span><i class="inline-block w-3 h-1 align-middle" style="background:#84cc16"></i> SeaHawk</span><span>&#9632; controller</span></div>`)}
    ${card(`<b class="text-slate-200">Test a leak</b>
        <select id="lk-cable" onchange="lkSelect(+this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-[11px]"></select>
        <label class="block"><span class="flex justify-between text-[11px] text-slate-400"><span>Leak position along cable</span><b id="lk-d" class="text-slate-100"></b></span>
        <input id="lk-slider" type="range" min="0" max="30" step="0.1" value="0" oninput="lkSlide(this.value)" class="w-full accent-sky-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"></label>
        <div id="lk-where" class="text-[11px] text-sky-200 bg-slate-900/60 rounded-lg p-2"></div>
        <div class="grid grid-cols-2 gap-2"><button onclick="lkSimulate()" class="tb-btn on">Simulate leak here</button><button onclick="lkRandomLeak()" class="tb-btn">Random leak</button>
            <button onclick="lkBreakTest()" class="tb-btn">Cable-break test</button><button onclick="lkReset()" class="tb-btn">Reset all</button></div>
        <p class="text-[10px] text-slate-500">Press Simulate more than once to test simultaneous leaks. Yellow ring = where the leak will be.</p>
        <div class="flex justify-between items-center border-t border-slate-700/50 pt-2 text-[11px]"><span class="text-slate-300">Main water valve <b id="lk-valve"></b></span>
            <label class="text-slate-300 flex items-center gap-1.5">Auto shut-off <input type="checkbox" id="lk-auto" checked onchange="lkAutoShut(this.checked)" class="accent-sky-500 h-4 w-4"></label></div>
        <div class="grid grid-cols-2 gap-2"><button onclick="lkValve(false,'manual')" class="tb-btn">Close valve</button><button onclick="lkValve(true,'manual')" class="tb-btn">Open valve</button></div>`)}
    ${card(`<b class="text-slate-200">Controller displays</b><div id="lk-displays" class="grid grid-cols-2 gap-2"></div>`)}`;
    const sel = document.getElementById('lk-cable'); sel.innerHTML = LK.cables.map((c, i) => `<option value="${i}">${LK_SYS[c.sys].name} · ${c.label.split(' · ').slice(-1)[0]} · ${c.cable} · ${c.len.toFixed(0)} m</option>`).join('');
    document.getElementById('lk-floors').innerHTML = ['BSMT', 'GF', 'F1', 'F2', 'SITE'].map(f => `<button id="lk-fl-${f}" onclick="lkFloor('${f}')" class="tb-btn !min-h-0 !py-1.5">${f === 'SITE' ? 'Site' : f}</button>`).join('');

    const ban = document.createElement('div');
    ban.id = 'lk-banner'; ban.className = 'hidden fixed z-[65] left-1/2 -translate-x-1/2 top-20 w-[22rem] max-w-[92vw] rounded-2xl border-2 border-sky-400 bg-sky-950/90 backdrop-blur shadow-2xl shadow-sky-900/50 p-3 text-xs text-sky-50 animate-pulse';
    ban.innerHTML = '<div class="flex items-center gap-3"><i class="fa-solid fa-droplet text-2xl text-sky-300"></i><div class="flex-1"><div id="lk-banner-t" class="font-extrabold text-sm"></div><div id="lk-banner-s" class="text-sky-200 text-[11px]"></div></div>'
        + '<div class="flex flex-col gap-1"><button onclick="lkShowLocation()" class="tb-btn">Show location</button><button onclick="lkReset()" class="tb-btn on">Reset</button></div></div>';
    document.body.appendChild(ban);
}
function lkSelect(i) { LK.sel = i; const c = LK.cables[i], s = document.getElementById('lk-slider'); s.max = c.len.toFixed(1); LK.slider = Math.min(LK.slider || 0, c.len); s.value = LK.slider; LK.view = c.floor; lkRefresh(); }
function lkSlide(v) { LK.slider = +v; lkRefresh(); }
function lkFloor(f) { LK.view = f; lkRefresh(); }
function lkShowCables(on) { LK.show = on; LK.cables.forEach(c => { c.group.visible = on; }); }
function lkRefresh() {
    const c = LK.cables[LK.sel]; if (!c || !document.getElementById('lk-d')) return;
    const d = LK.slider || 0, p = lkPointAt(c, d);
    document.getElementById('lk-d').innerText = d.toFixed(1) + ' m of ' + c.len.toFixed(1) + ' m (' + (d * 3.28084).toFixed(0) + ' ft)';
    document.getElementById('lk-where').innerHTML = `<b>${lkRoomAt(c, p)}</b> · ${FLOOR_LABEL[c.floor] || 'Site'}<br>x ${p.x.toFixed(2)} m, z ${p.z.toFixed(2)} m · ${c.cable}` + (c.sys === 'als' ? ` · zone ${Math.min(c.zones, Math.floor(d / (c.len / c.zones)) + 1)} of ${c.zones}` : '');
    const v = document.getElementById('lk-valve'); if (v) { v.innerText = LK.valveOpen ? 'OPEN' : 'CLOSED'; v.className = LK.valveOpen ? 'text-emerald-400' : 'text-rose-400'; }
    if (LK.fx.lever) { LK.fx.lever.material.color.setHex(LK.valveOpen ? 0x22c55e : 0xef4444); }
    ['BSMT', 'GF', 'F1', 'F2', 'SITE'].forEach(f => { const b = document.getElementById('lk-fl-' + f); if (b) b.classList.toggle('on', LK.view === f); });
    document.getElementById('lk-cable').value = LK.sel;
    if (LK.fx.probe) { LK.fx.probe.position.set(p.x, c.y + 0.05, p.z); }
    lkDraw2D();
}

/* ---------------------------------------------------------------- per-frame / slow tick / init */
function lkTick(dt, t) {
    if (!LK.ready) return;
    if (LK.fx.probe) LK.fx.probe.visible = LK.tabOn && LK.show; if (LK.fx.probe && LK.fx.probe.visible) LK.fx.probe.scale.setScalar(1 + 0.15 * Math.sin(t * 5));
    if (LK.fx.lever) { const tgt = LK.valveOpen ? 0 : Math.PI / 2; LK.fx.lever.rotation.y += (tgt - LK.fx.lever.rotation.y) * Math.min(1, dt * 4); }
    LK.leaks.forEach(l => {
        const fx = l.fx; if (!fx) return; const age = (performance.now() - l.t0) / 1000, M = fx.marker;
        const k = (t * 1.3) % 1; M.ring.scale.setScalar(1 + k * 4); M.ring.material.opacity = 1 - k; M.beam.material.opacity = 0.25 + 0.12 * Math.sin(t * 7); M.sp.position.y = 2.9 + Math.sin(t * 3) * 0.1;
        if (fx.puddle) {
            const r = Math.min(1.5, 0.15 + age * 0.06); fx.puddle.scale.set(r, 1, r); fx.ripple.scale.set(r * (0.5 + ((t * 0.8) % 1) * 0.5), r * (0.5 + ((t * 0.8) % 1) * 0.5), 1); fx.ripple.material.opacity = 0.5 * (1 - ((t * 0.8) % 1));
            const p = fx.drips.geometry.attributes.position.array, base = l.pos.y;
            for (let i = 1; i < p.length; i += 3) { p[i] -= 3.2 * dt; if (p[i] < base) p[i] = fx.top - Math.random() * 0.3; }
            fx.drips.geometry.attributes.position.needsUpdate = true;
        }
    });
    Object.values(LK.ctrls).forEach(k => { k.led.material.color.setHex(k.alarm ? (Math.floor(t * 4) % 2 ? 0xff2020 : 0x330000) : 0x22c55e); });
}
function lkSlowTick() { if (LK.ready && (LK.tabOn || LK.leaks.length)) lkDraw2D(); }

function lkInit() {
    lkBuild(); lkUI(); LK.ready = true; LK.slider = 0; lkUpdateCtrls(); lkSelect(0);
    const _st = switchTab;
    switchTab = function (id) { _st(id); LK.tabOn = id === 'leak'; if (id === 'leak') lkRefresh(); };
}
