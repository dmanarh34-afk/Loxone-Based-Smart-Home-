/* =====================================================================
   CINEMATIC TOUR
   A scripted film of the house: smooth spline camera paths with lens changes, dip-to-black cuts,
   2.39:1 letterbox, vignette, film grain, colour grade, hand-held drift, lower-third captions,
   a generated ambient score, and real actions on the building (gate opens, pool lights, cinema
   plays, dusk to night). Optional "Record" captures the whole film (bars + captions + music)
   to a .webm you can save. Start it from the left panel: "Cinematic Tour (film)". Esc stops.
   Loaded after premium_features.js; uses the main script's globals (camera, controls, scene...).
===================================================================== */
const CINE = { active: false, i: -1, t: 0, shots: [], saved: null, fade: 0, fadeDir: 0, caption: '', capT: 0, title: null, music: null, rec: null, recBlob: null, comp: null, grainIv: null, camPos: null, camLook: null, shake: 0 };

function cv3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }
/* Interior shots pick their own camera: for each room a spot is searched (wall rays, a clearance check and the floor polygon) that sees
   the room centre without a wall in between, then the camera pushes in slowly with a small sideways drift. The film therefore follows
   the architecture instead of fixed coordinates and survives later layout changes. */
function cineColliders(f, glass) {   // glass = true: window panes count too (room extents); false: opaque only
    const out = [], add = (o, wallsOnly) => { if (!o.isMesh || !o.visible) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; if (ms.some(m => m === MAT.glass) ? !glass : ms.some(m => m.transparent)) return;
        if (wallsOnly && !(o.geometry.type === 'BoxGeometry' && ms.some(m => m === FMAT.wall || m === MAT.grayWall || m === MAT.brickWall))) return; out.push(o); };
    if (shells[f]) shells[f].traverse(o => add(o, false));
    if (floorGroups[f]) floorGroups[f].traverse(o => add(o, true));   // interior partitions
    return out;
}
function cineAuto(f, c, opt = {}) {
    // 1) the room's rectangle: from the room centre, rays along +x / -x / +z / -z (five parallel rays per side, median hit so a doorway does not stretch the room)
    const list = cineColliders(f, true), poly = worldPoly(f, PLAN[f].poly), rc = new THREE.Raycaster(), yL = LEVEL[f] + 1.3, CAP = opt.cap || 6.5;
    const reach = (dx, dz) => { const ds = []; for (const o of [-0.7, -0.35, 0, 0.35, 0.7]) { const org = new THREE.Vector3(c[0] + (dx ? 0 : o), yL, c[1] + (dz ? 0 : o));
        rc.set(org, new THREE.Vector3(dx, 0, dz)); rc.far = CAP; let h = null; try { h = rc.intersectObjects(list, false)[0]; } catch (e) {} ds.push(h ? h.distance : CAP); } ds.sort((p, q) => p - q); return ds[2]; };
    const R = { x0: c[0] - Math.min(reach(-1, 0), opt.maxW || 99), x1: c[0] + Math.min(reach(1, 0), opt.maxW || 99), z0: c[1] - Math.min(reach(0, -1), opt.maxD || 99), z1: c[1] + Math.min(reach(0, 1), opt.maxD || 99) };
    if (opt.rect) Object.assign(R, opt.rect);   // explicit room rectangle where the walls cannot be probed (open plan, glazed sides)
    const ctr = new THREE.Vector3((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2), inset = 0.3;
    // 2) camera in the corner that has the best clear view of the room centre (and sits on the floor plan); opt.prefer = a direction (radians) the camera should favour
    const corners = [[R.x0 + inset, R.z0 + inset], [R.x1 - inset, R.z0 + inset], [R.x0 + inset, R.z1 - inset], [R.x1 - inset, R.z1 - inset]];
    let best = null;
    corners.forEach(([x, z]) => {
        if (!pointInPoly({ x, z }, poly)) return;
        const d = new THREE.Vector3(ctr.x - x, 0, ctr.z - z), len = d.length(); d.normalize(); rc.set(new THREE.Vector3(x, yL, z), d); rc.far = len; let blocked = false; try { blocked = !!rc.intersectObjects(list, false)[0]; } catch (e) {}
        const ang = Math.atan2(z - ctr.z, x - ctr.x), score = (blocked ? -10 : 0) + (opt.prefer != null ? Math.cos(ang - opt.prefer) : 0);
        if (!best || score > best.score) best = { x, z, score };
    });
    if (opt.cam) best = { x: opt.cam[0], z: opt.cam[1] };
    if (!best) best = { x: ctr.x + 1, z: ctr.z + 1 };
    // 3) lens: wide enough that all four room corners are inside the frame (horizontal angle between the view direction and each corner)
    const cam = new THREE.Vector3(best.x, 0, best.z), dir = ctr.clone().sub(cam).setY(0).normalize();
    let spread = 0; [[R.x0, R.z0], [R.x1, R.z0], [R.x0, R.z1], [R.x1, R.z1]].forEach(([x, z]) => { const v = new THREE.Vector3(x - cam.x, 0, z - cam.z); if (v.length() < 0.2) return; spread = Math.max(spread, Math.acos(Math.min(1, v.normalize().dot(dir)))); });
    const hfov = Math.min(opt.maxFov || 104, Math.max(55, THREE.MathUtils.radToDeg(2 * spread) + 12));
    const ey = LEVEL[f] + (opt.eye || 1.95), ly = LEVEL[f] + (opt.ly || 0.75), far = cam, near = cam.clone().lerp(ctr, 0.16);
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.18);
    return { pos: [[far.x, ey, far.z], [(far.x + near.x) / 2 + side.x, ey - 0.03, (far.z + near.z) / 2 + side.z], [near.x, ey - 0.06, near.z]], look: [[ctr.x, ly, ctr.z], [ctr.x, ly, ctr.z], [ctr.x, ly - 0.03, ctr.z]], hfov, rect: R };
}
function cineShots() {
    const table = IP('GF', 590, 480), bd = INTERIOR.F2.furniture.find(f => f[0] === 'bed'), ba = IP('F2', bd[1], bd[2]), bb = IP('F2', bd[3], bd[4]);
    const bx0 = Math.min(ba.x, bb.x), bx1 = Math.max(ba.x, bb.x), bz = (ba.z + bb.z) / 2, bcx = (bx0 + bx1) / 2, F2y = LEVEL.F2; // foot of the bed is on the -x side (headboard on +x)
    const room = (f, c, cap, dur, o = {}) => ({ n: cap[0], dur, fov: o.fov || [46, 40], cap, floor: o.floor || 'ALL', exp: o.exp || 1.0, scene: o.scene, on: o.on, ...cineAuto(f, c, o) });
    return [
        // chapter 1: the plot
        { n: 'Arrival', dur: 10, fov: [40, 30], cap: ['Plot 1 · Glenshire Hills', 'A Loxone smart home'], title: true, scene: 'DUSK', floor: 'ALL', exp: 1.0,
          pos: [[-4, 11, 42], [-1, 8, 34], [5, 5.4, 27.5]], look: [[1, 4, 6], [1, 4.4, 6], [1, 4.6, 6]], on: () => { if (isGateOpen) toggleMainGate(); } },
        { n: 'Gate', dur: 9, fov: [34, 34], cap: ['Automated gate', 'Opens from the Loxone intercom, app or tablet'], exp: 1.0,
          pos: [[-1.5, 1.5, 30], [3.5, 1.7, 28.5], [8.5, 1.8, 21], [7, 2.0, 14]], look: [[6, 1.1, 24.3], [8, 1.3, 24.3], [5, 2.6, 12], [1, 4, 8]], on: () => { if (!isGateOpen) toggleMainGate(); } },
        { n: 'Glass box', dur: 9, fov: [30, 30], cap: ['Double-height glass living space', 'DALI / DMX lighting follows the time of day'],
          pos: [[16, 2.2, 19], [10, 2.6, 25], [0, 3, 26], [-8, 3.4, 22]], look: [[1, 3.6, 6], [1, 3.8, 6], [1, 3.8, 6], [0, 3.8, 6]] },
        { n: 'Pool', dur: 8, fov: [32, 32], cap: ['Pool, plunge pool & louvred pergola', 'Underwater, deck and pergola lighting on Loxone'], scene: 'RELAX_POOL',
          pos: [[-17, 1.3, 14], [-13, 1.5, 11.5], [-10.5, 1.8, 8.5]], look: [[-6.5, 1.2, 4], [-6, 1.5, 4], [-5, 2, 3]] },
        // chapter 2: ground floor
        room('GF', [4.42, 7.96], ['Entrance', 'Video intercom, door tablet and welcome lighting'], 6, { scene: 'DEFAULT', prefer: -1.2, rmax: 3.2 }),
        { n: 'Living', exp: 0.9, dur: 10, fov: [48, 52], cap: ['Living & dining', 'Scenes, shades and multiroom audio in one touch'], floor: 'ALL',
          pos: [[0.5, 1.6, 14], [0.2, 1.6, 9.0], [0.3, 1.65, 6.3], [1.4, 1.6, 4.9]], look: [[0.5, 1.9, 6], [0.4, 1.7, 4], [table.x, 1.3, table.z], [table.x - 0.4, 1.2, table.z - 0.5]] },
        room('GF', [6.4, -0.45], ['Kitchen', 'Presence-controlled lighting and extraction'], 6, { rect: { x0: 4.66, x1: 8.2, z0: -2.32, z1: 1.8 }, cam: [7.85, 1.45] }),
        room('GF', [1.6, -3.9], ['Wet kitchen', 'Leak sensing at every sink and tap'], 6, { rect: { x0: 0.26, x1: 2.94, z0: -5.23, z1: -2.59 }, cam: [2.75, -2.75] }),
        room('GF', [-4.05, -3.1], ['Guest bedroom', 'Scenes, shades and a touch switch by the bed'], 7, { prefer: 0 }),
        room('GF', [7.0, -3.9], ["Boy's quarters", 'A separate zone with its own lighting and air control'], 6, { prefer: Math.PI / 2 }),
        { n: 'Sauna', dur: 6, fov: [46, 40], cap: ['Sauna & guest WC', 'Humidity-aware ventilation and moisture protection'], floor: 'GF', exp: 1.0,
          pos: [[-6.9, 7.0, -1.3], [-6.8, 6.8, -1.9], [-6.76, 6.6, -2.4]], look: [[-6.76, 0.5, -3.1], [-6.76, 0.5, -3.0], [-6.76, 0.5, -3.0]] },
        // chapter 3: first floor
        room('F1', [0.66, 2.76], ['Family area', 'Multiroom audio, scenes and ambient lighting'], 7, { maxW: 3.3, maxD: 3.4 }),
        room('F1', [-5.87, -3.7], ['Male suite', 'Dimmable bedside lighting and shading'], 7, { prefer: 0 }),
        room('F1', [0.67, -3.87], ['Female suite', 'Wake-up scenes, shades and ensuite lighting'], 7),
        room('F1', [4.95, -5.2], ['Female bathroom', 'Mirror lighting, extraction and leak protection'], 6, { prefer: Math.PI / 2, maxFov: 108 }),
        room('F1', [5.41, -1.11], ["Kids' suite", 'Night-light scene, window sensors and presence control'], 6),
        room('F1', [7.41, -4.86], ['Ensuites & WCs', 'Motion lighting and humidity-controlled fans'], 5, { rmax: 2.2 }),
        // chapter 4: second floor
        { n: 'Master', dur: 9, fov: [50, 50], cap: ['Master suite', 'Bed LED strip, Touch Pure Flex and control tablet'], floor: 'ALL', exp: 0.95,
          pos: [[bx0 - 3.2, F2y + 1.7, bz + 1.4], [bx0 - 2.1, F2y + 1.55, bz + 0.5]], look: [[bcx, F2y + 0.7, bz - 0.2], [bcx + 0.2, F2y + 0.8, bz]] },
        room('F2', [-2.03, -4.89], ['Master ensuite', 'Spa bathroom with motion lighting'], 5, { rmax: 2.2 }),
        room('F2', [6.10, -5.25], ['Walk-in closet', 'Oak fittings, shelf lighting and a window view'], 6, { rmax: 2.6 }),
        room('F2', [6.2, -1.1], ['Study', 'Task lighting and air-quality-aware ventilation'], 6, { prefer: Math.PI / 2 }),
        room('F2', [2.6, 5.2], ['Second-floor lounge & kitchenette', 'A relaxed upper living space with scenes at a tap'], 7, { maxW: 3.6, maxD: 3.4 }),
        { n: 'Roof', dur: 7, fov: [38, 32], cap: ['Solar array & polytanks', '15 panels, 500 L tanks and live energy monitoring'], floor: 'ALL', exp: 1.0, scene: 'DUSK',
          pos: [[12.5, 13.6, 7.5], [8.5, 12.6, 3.0], [4.5, 12.0, 2.6]], look: [[4, 10.9, -2.6], [4, 10.9, -3.0], [2.4, 11.2, -5.4]] },
        // chapter 5: basement
        { n: 'Cinema', dur: 10, fov: [42, 38], cap: ['Basement cinema', '8 recliners, projector, curtains and lighting scenes'], scene: 'CINEMA', floor: 'BSMT', exp: 1.0,
          pos: [[6.9, -0.7, 0.4], [6.3, -0.8, 0.9], [5.2, -0.9, 1.6]], look: [[-1.5, -1.6, 1.8], [-1.6, -1.6, 1.8], [-1.6, -1.5, 1.8]] },
        room('BSMT', [0.1, 0.25], ['Basement bar', 'Lit bottle shelves and a waterfall counter'], 6, { floor: 'BSMT', rmax: 3.0 }),
        room('BSMT', [5.65, 0.15], ['Basement lounge', 'Curved sofas and sconces that follow the cinema scenes'], 6, { floor: 'BSMT', rmax: 3.2 }),
        room('BSMT', [5.57, 3.67], ['Glass lift & stair', 'Connects all four levels'], 5, { floor: 'BSMT', rmax: 3.0, ly: 1.3 }),
        // chapter 6: energy and finale
        { n: 'Energy', dur: 8, fov: [32, 32], cap: ['Energy independence', 'Solar, battery, generator relay and load shedding'], floor: 'ALL', scene: 'DUSK',
          exp: 1.1, on: () => shedDoor(true), pos: [[SHED.cx - 3.2, 2.4, SHED.cz + 4.2], [SHED.cx - 1.3, 1.7, SHED.cz + 2.3], [SHED.cx - 0.25, 1.6, SHED.cz + 0.45]], look: [[SHED.cx, 1.3, SHED.cz], [SHED.cx + 0.6, 1.3, SHED.cz], [SHED.cx + 1.45, 1.3, SHED.cz - 0.55]] },
        { n: 'Night', dur: 11, fov: [34, 28], cap: ['Plot 1 · Glenshire Hills', 'Premium package · The Intelligent Estate'], title: true, scene: 'NIGHT', floor: 'ALL', exp: 1.0,
          pos: [[13, 3.8, 31], [20, 9, 38], [30, 19, 46]], look: [[1, 4.6, 7], [1, 4.8, 7], [1, 4.6, 6]] }
    ].map(s => ({ ...s, posC: new THREE.CatmullRomCurve3(s.pos.map(cv3), false, 'centripetal'), lookC: new THREE.CatmullRomCurve3(s.look.map(cv3), false, 'centripetal') }));
}

/* ---------------------------------------------------------------- overlay UI */
function cineBuildUI() {
    const css = document.createElement('style');
    css.textContent = `.cine-on #top-bar,.cine-on #left-panel,.cine-on #right-panel,.cine-on #site-footer,.cine-on #tooltip,.cine-on #xp-card{display:none!important}
        #cine-wrap{position:fixed;inset:0;z-index:80;pointer-events:none;display:none}.cine-on #cine-wrap{display:block}
        .cine-bar{position:absolute;left:0;right:0;background:#000;transition:height 1.2s ease}
        #cine-vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%)}
        #cine-grain{position:absolute;inset:0;width:100%;height:100%;opacity:.035;mix-blend-mode:overlay}
        #cine-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .6s ease}
        #cine-cap{position:absolute;left:7vw;bottom:calc(var(--cine-bar,12vh) + 28px);color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.8);opacity:0;transform:translateY(8px);transition:opacity .9s ease,transform .9s ease}
        #cine-cap.on{opacity:1;transform:none}#cine-cap b{display:block;font:600 clamp(18px,2.6vw,34px)/1.1 Georgia,serif;letter-spacing:.04em}
        #cine-cap span{display:block;margin-top:6px;font:400 clamp(11px,1.2vw,15px)/1.3 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#d1d5db}
        #cine-ctl{position:absolute;right:20px;top:18px;pointer-events:auto;display:flex;gap:8px;opacity:.55}#cine-ctl:hover{opacity:1}
        #cine-ctl button{background:rgba(15,23,42,.75);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:999px;padding:7px 14px;font:600 12px Arial}
        #cine-rec{position:absolute;left:20px;top:18px;color:#ef4444;font:700 12px Arial;display:none}`;
    document.head.appendChild(css);
    const w = document.createElement('div'); w.id = 'cine-wrap';
    w.innerHTML = `<canvas id="cine-grain" width="480" height="270"></canvas><div id="cine-vig"></div>
        <div class="cine-bar" id="cine-top" style="top:0;height:0"></div><div class="cine-bar" id="cine-bot" style="bottom:0;height:0"></div>
        <div id="cine-cap"><b id="cine-cap-t"></b><span id="cine-cap-s"></span></div><div id="cine-fade"></div>
        <div id="cine-rec">&#9679; REC</div>
        <div id="cine-ctl"><button onclick="cineMute()" id="cine-mute">Sound on</button><button onclick="cineStop()">Stop (Esc)</button></div>`;
    document.body.appendChild(w);
    const holder = [...document.querySelectorAll('button')].find(b => /runGuidedTour/.test(b.getAttribute('onclick') || ''));
    if (holder) {
        const btn = document.createElement('button');
        btn.className = 'w-full mt-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 p-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg shadow-violet-500/20 flex items-center justify-center space-x-2';
        btn.innerHTML = '<i class="fa-solid fa-clapperboard"></i><span>Cinematic Tour (film)</span>'; btn.onclick = () => cineStart(false);
        const rec = document.createElement('button');
        rec.className = 'w-full mt-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 p-2 rounded-xl text-[11px] font-bold text-slate-200 transition flex items-center justify-center space-x-2';
        rec.innerHTML = '<i class="fa-solid fa-circle text-rose-500"></i><span>Cinematic Tour + record video</span>'; rec.onclick = () => cineStart(true);
        const sv = document.createElement('button'); sv.id = 'cine-save';
        sv.className = 'hidden w-full mt-1 bg-emerald-700 hover:bg-emerald-600 p-2 rounded-xl text-[11px] font-bold text-white transition'; sv.innerHTML = '<i class="fa-solid fa-download mr-1"></i>Save recorded film (.webm)'; sv.onclick = cineSave;
        holder.after(btn); btn.after(rec); rec.after(sv);
    }
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && CINE.active) cineStop(); });
}

/* ---------------------------------------------------------------- score (generated, no files) */
function cineMusicStart() {
    try {
        pxAudioCtx = pxAudioCtx || new (window.AudioContext || window.webkitAudioContext)(); const c = pxAudioCtx; if (c.state === 'suspended') c.resume();
        const master = c.createGain(); master.gain.value = 0.0001; master.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 4);
        const len = c.sampleRate * 3, ir = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
        const rev = c.createConvolver(); rev.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.55; const dry = c.createGain(); dry.gain.value = 0.7;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.4;
        lp.connect(dry); lp.connect(rev); rev.connect(wet); dry.connect(master); wet.connect(master); master.connect(c.destination);
        const dest = c.createMediaStreamDestination(); master.connect(dest);
        const chords = [[220, 261.63, 329.63, 440], [174.61, 220, 261.63, 349.23], [261.63, 329.63, 392, 523.25], [196, 246.94, 293.66, 392]], scale = [440, 493.88, 523.25, 587.33, 659.25, 783.99, 880];
        const M = { c, master, dest, iv: null, step: 0, muted: false };
        const play = () => {
            const t0 = c.currentTime, ch = chords[M.step % 4]; M.step++;
            ch.forEach((f, k) => [-4, 4].forEach(det => { const o = c.createOscillator(), g = c.createGain(); o.type = k % 2 ? 'sine' : 'triangle'; o.frequency.value = f * (k === 0 ? 0.5 : 1); o.detune.value = det;
                g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 8.6); o.connect(g); g.connect(lp); o.start(t0); o.stop(t0 + 9); }));
            for (let i = 0; i < 4; i++) { const f = scale[Math.floor(Math.random() * scale.length)], s = t0 + 0.8 + i * 1.9 + Math.random() * 0.5, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.035, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 2.4); o.connect(g); g.connect(rev); g.connect(dry); o.start(s); o.stop(s + 2.6); }
        };
        play(); M.iv = setInterval(play, 7600); CINE.music = M;
    } catch (e) { CINE.music = null; }
}
function cineMusicStop() {
    const M = CINE.music; if (!M) return; clearInterval(M.iv);
    try { M.master.gain.cancelScheduledValues(M.c.currentTime); M.master.gain.setValueAtTime(M.master.gain.value, M.c.currentTime); M.master.gain.exponentialRampToValueAtTime(0.0001, M.c.currentTime + 1.5); } catch (e) {}
    setTimeout(() => { try { M.master.disconnect(); } catch (e) {} }, 1800); CINE.music = null;
}
function cineMute() { const M = CINE.music; if (!M) return; M.muted = !M.muted; M.master.gain.value = M.muted ? 0.0001 : 0.5; px$('cine-mute').innerText = M.muted ? 'Sound off' : 'Sound on'; }

/* ---------------------------------------------------------------- film recorder (composites the 3D view with bars, grain and captions) */
function cineRecStart() {
    try {
        const src = renderer.domElement, cw = Math.min(1920, src.width), ch = Math.round(cw * src.height / src.width);
        const comp = document.createElement('canvas'); comp.width = cw; comp.height = ch; CINE.comp = comp;
        const stream = comp.captureStream(30); if (CINE.music && CINE.music.c.state === 'running') CINE.music.dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); // a suspended audio context would stall the muxer
        const hasA = stream.getAudioTracks().length > 0, mime = [hasA ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp9', hasA ? 'video/webm;codecs=vp8,opus' : 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => { CINE.recBlob = new Blob(chunks, { type: 'video/webm' }); const s = px$('cine-save'); if (s) s.classList.remove('hidden'); };
        rec.start(1000); CINE.rec = rec; px$('cine-rec').style.display = 'block';
    } catch (e) { CINE.rec = null; console.warn('Recording unavailable', e); }
}
function cineComposite() { // runs inside animate() right after the frame is rendered
    const comp = CINE.comp; if (!comp || !CINE.rec) return; const g = comp.getContext('2d'), w = comp.width, h = comp.height;
    g.drawImage(renderer.domElement, 0, 0, w, h);
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    const bar = Math.max(0, (h - w / 2.39) / 2) * CINE.barK; g.fillStyle = '#000'; g.fillRect(0, 0, w, bar); g.fillRect(0, h - bar, w, bar);
    if (CINE.caption && CINE.capOn) { g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 12; g.fillStyle = '#fff'; g.font = `600 ${Math.round(h * 0.045)}px Georgia`; g.fillText(CINE.caption[0], w * 0.07, h - bar - h * 0.07);
        g.font = `${Math.round(h * 0.02)}px Arial`; g.fillStyle = '#d1d5db'; g.fillText(CINE.caption[1].toUpperCase(), w * 0.07, h - bar - h * 0.035); g.restore(); }
    if (CINE.fadeA > 0.001) { g.fillStyle = `rgba(0,0,0,${CINE.fadeA})`; g.fillRect(0, 0, w, h); }
}
function cineSave() { if (!CINE.recBlob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(CINE.recBlob); a.download = 'plot1-smart-home-cinematic-tour.webm'; document.body.appendChild(a); a.click(); a.remove(); }

/* ---------------------------------------------------------------- tour control */
function cineStart(record) {
    if (CINE.active) return;
    if (typeof xp !== 'undefined' && xp.i >= 0) stopExperienceTour(); if (walk.active) toggleWalk(false); exitCCTV(); closeTablet();
    CINE.shots = cineShots(); CINE.active = true; CINE.i = -1; CINE.barK = 0; CINE.fadeA = 0; CINE.capOn = false; CINE.caption = null;
    CINE.saved = { exp: renderer.toneMappingExposure, pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, scene: currentScene, labels: roomLabelsOn, markers: markersOn, floor: currentFloor, filter: renderer.domElement.style.filter, plan: !!(planMeshes[0] && planMeshes[0].visible) };
    if (LK.fx.valveG) LK.fx.valveG.visible = false;
    CINE.hid = { cables: LK.show, beams: PX.sec.beams }; if (typeof lkShowCables === 'function') lkShowCables(false); Object.values(LK.ctrls).forEach(k => { k.g.visible = false; }); PX.sec.beams = false; // technical overlays off for the film
    roomLabelsOn = false; markersOn = false; refreshRoomLabels(); refreshMarkers(); camAnim = null; controls.enabled = false;
    renderer.domElement.style.filter = 'contrast(1.1) saturate(1.14) brightness(1.02)';
    document.body.classList.add('cine-on'); document.documentElement.style.setProperty('--cine-bar', '12vh');
    if (typeof togglePlanOverlay === 'function') togglePlanOverlay(false);
    const grain = px$('cine-grain'), gg = grain.getContext('2d'); CINE.grainIv = setInterval(() => { const d = gg.createImageData(480, 270); for (let k = 0; k < d.data.length; k += 4) { const v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; } gg.putImageData(d, 0, 0); }, 90);
    px$('cine-top').style.height = px$('cine-bot').style.height = '12vh';
    px$('cine-fade').style.opacity = 1;
    cineMusicStart(); if (record) setTimeout(cineRecStart, 150);
    setTimeout(() => cineGo(0), 900);
}
function cineGo(i) {
    if (!CINE.active) return;
    if (i >= CINE.shots.length) { cineEnd(); return; }
    const s = CINE.shots[i]; CINE.i = i; CINE.t = 0;
    if (s.scene === 'RELAX_POOL') setPoolScene('relax'); else if (s.scene === 'CINEMA') { setCinemaScene('movie'); } else if (s.scene) triggerScene(s.scene);
    setFloorFilter(s.floor || 'ALL', true); if (s.exp) renderer.toneMappingExposure = s.exp; if (s.on) s.on();
    CINE.caption = s.cap; px$('cine-cap-t').innerText = s.cap[0]; px$('cine-cap-s').innerText = s.cap[1];
    px$('cine-fade').style.opacity = 0; CINE.capOn = false; setTimeout(() => { if (CINE.i === i) { px$('cine-cap').classList.add('on'); CINE.capOn = true; } }, 1400);
}
function cineEnd() {
    px$('cine-cap').classList.remove('on'); CINE.capOn = false; px$('cine-fade').style.opacity = 1; setTimeout(cineStop, 1600);
}
function cineStop() {
    if (!CINE.active) return; CINE.active = false; clearInterval(CINE.grainIv); cineMusicStop();
    if (CINE.rec) { try { CINE.rec.stop(); } catch (e) {} CINE.rec = null; px$('cine-rec').style.display = 'none'; }
    px$('cine-cap').classList.remove('on'); px$('cine-top').style.height = px$('cine-bot').style.height = '0'; px$('cine-fade').style.opacity = 0;
    if (LK.fx.valveG) LK.fx.valveG.visible = true;
    if (CINE.hid) { lkShowCables(CINE.hid.cables); Object.values(LK.ctrls).forEach(k => { k.g.visible = true; }); PX.sec.beams = CINE.hid.beams; CINE.hid = null; }
    const S = CINE.saved; document.body.classList.remove('cine-on'); if (S && S.exp) renderer.toneMappingExposure = S.exp;
    if (S) { renderer.domElement.style.filter = S.filter || ''; roomLabelsOn = S.labels; markersOn = S.markers; refreshRoomLabels(); refreshMarkers(); triggerScene(S.scene); setFloorFilter('ALL', true);
        camera.fov = S.fov; camera.updateProjectionMatrix(); camera.position.copy(S.pos); controls.target.copy(S.tgt); if (typeof togglePlanOverlay === 'function') togglePlanOverlay(S.plan); }
    controls.enabled = true; controls.update(); CINE.saved = null;
}

/* ---------------------------------------------------------------- per-frame (called from premiumTick) */
function cineTick(dt, t) {
    if (!CINE.active) return;
    const bk = parseFloat(px$('cine-top').style.height) > 0 ? 1 : 0; CINE.barK += (bk - CINE.barK) * Math.min(1, dt * 1.6);
    CINE.fadeA = parseFloat(getComputedStyle(px$('cine-fade')).opacity) || 0;
    const s = CINE.shots[CINE.i]; if (!s) return;
    CINE.t += dt; const k = Math.min(1, CINE.t / s.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, lin = 0.35 * k + 0.65 * e; // gentle ease, mostly continuous motion
    camera.position.copy(s.posC.getPoint(lin)); const look = s.lookC.getPoint(lin);
    if (s.hfov) { const vis = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(s.hfov) / 2) / 2.39); camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(vis / 2) / 0.74)) + 0 * lin; camera.fov = Math.min(camera.fov, 100); } else camera.fov = s.fov[0] + (s.fov[1] - s.fov[0]) * lin; camera.updateProjectionMatrix();
    camera.lookAt(look);
    const sh = 0.012 + (s.fov[0] < 40 ? 0.004 : 0); // subtle hand-held drift
    camera.position.x += Math.sin(t * 0.9) * sh + Math.sin(t * 2.3) * sh * 0.4; camera.position.y += Math.sin(t * 1.1 + 1) * sh * 0.8; camera.rotateZ(Math.sin(t * 0.6) * 0.0035);
    controls.target.copy(look);
    if (CINE.t > s.dur - 0.9 && CINE.t - dt <= s.dur - 0.9) { px$('cine-fade').style.opacity = 1; px$('cine-cap').classList.remove('on'); CINE.capOn = false; }
    if (CINE.t >= s.dur) cineGo(CINE.i + 1);
}
function cineInit() { cineBuildUI(); }
