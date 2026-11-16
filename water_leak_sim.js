/* =====================================================================
   WATER LEAK DETECTION SIMULATION: x-ray building, water pipes, leak detection + protection
   Standalone page (water_leak_simulation.html). Plan data is the same as the main smart-home simulation.
   Layout of the plumbing is indicative (not on the IBS drawings). Behaviour is simulated.
===================================================================== */
'use strict';
(() => {
const $ = id => document.getElementById(id);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------ plan data */
const LEVEL = { BSMT: -3.0, GF: 0.45, F1: 3.75, F2: 7.05, ROOF: 10.35 }, FH = 3.3;
const FLOORS = ['BSMT', 'GF', 'F1', 'F2'], ORDER = ['BSMT', 'GF', 'F1', 'F2', 'ROOF'];
const FL = { BSMT: 'Basement', GF: 'Ground floor', F1: 'First floor', F2: 'Second floor', ROOF: 'Roof', SITE: 'Site (underground)' };
const MAP = { BSMT: { s: 123, cx: 195, cy: 157.75, ox: -1.56, oz: -2.39 }, GF: { s: 42, cx: 936, cy: 530, ox: 5.28, oz: 3.38 }, F1: { s: 60, cx: 967, cy: 717, ox: 5.28, oz: 3.38 }, F2: { s: 42, cx: 872, cy: 675, ox: 5.28, oz: 3.38 } };
const W = (f, px, py) => { const m = MAP[f]; return { x: (px - m.cx) / m.s + m.ox, z: (py - m.cy) / m.s + m.oz }; };
const PI_ = { GF: [300, 130], F1: [120, 95], F2: [520, 215] };
const IP = (f, ix, iy) => { const o = PI_[f]; return W(f, o[0] + ix * 0.75, o[1] + iy * 0.75); };
const POLY = {
    BSMT: [[162, 127], [1347, 127], [1347, 1073], [162, 1073]],
    GF: [[365, 160], [1060, 160], [1060, 290], [1093, 290], [1093, 450], [1020, 450], [1020, 665], [845, 665], [845, 805], [580, 805], [580, 610], [645, 610], [645, 360], [365, 360]],
    F1: [[135, 140], [520, 140], [520, 108], [1165, 108], [1165, 590], [1090, 590], [1090, 920], [820, 920], [820, 830], [470, 830], [470, 545], [135, 545]],
    F2: [[535, 230], [1025, 230], [1025, 580], [975, 580], [975, 835], [620, 835], [620, 650], [535, 650]]
};
const WP = {}; FLOORS.forEach(f => { WP[f] = POLY[f].map(p => W(f, p[0], p[1])); });
const LABELS = {
    BSMT: [['Cinema', '', 0.45, 2.6], ['Bar', '', 0.1, 0.25], ['Lounge', '', 5.65, 0.15], ['Lift', '', 5.57, 3.67], ['Stair', '', 2.6, -1.85]],
    GF: [['WC', '', 172, 88], ['Sauna', '', 172, 168], ['Guest Bedroom', '', 300, 240], ['Sho. WC', '', 497, 100], ['Wet Kitchen', '', 650, 135], ['WC', '', 842, 70], ["Boy's Quarters", '', 950, 160], ['Kitchen', '', 880, 362],
        ['Living + Dining', '', 590, 625], ['WC', '', 845, 462], ['Entrance', '', 800, 790]],
    F1: [['Male Suite', '', 300, 300], ['Ensuite', '', 505, 185], ['Female Suite', '', 735, 215], ['WC / Sho.', '', 1085, 150], ['WC / Sho.', '', 1300, 170], ["Kids' Suite", '', 1140, 470], ['Family Area', '', 760, 780]],
    F2: [['Master Bedroom', '', 230, 470], ['Ensuite', '', 60, 150], ['Polytank Area', '', 285, 75], ['Walk-in Closet', '', 515, 130], ['Study', '', 480, 365], ['Lounge', '', 275, 715], ['Kitchenette', '', 400, 760]]
};
const rp = (f, a, b) => f === 'BSMT' ? { x: a, z: b } : IP(f, a, b);
function inside(poly, x, z) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) c = !c; } return c; }
function edgeDist(poly, x, z) { let m = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1); m = Math.min(m, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz))); } return m; }

/* ------------------------------------------------------------ scene */
const view = $('view'), renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); view.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x060b14); scene.fog = new THREE.Fog(0x060b14, 90, 220);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500); camera.position.set(-24, 17, 38);
const controls = new THREE.OrbitControls(camera, renderer.domElement); controls.target.set(0, 3, 4); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxDistance = 140;
scene.add(new THREE.AmbientLight(0xffffff, 0.85)); const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(-20, 40, 25); scene.add(dl);
const grid = new THREE.GridHelper(120, 60, 0x1e3a5f, 0x0f1f33); grid.position.y = -3.2; scene.add(grid);
const GR = {}; ['BSMT', 'GF', 'F1', 'F2', 'ROOF', 'SITE', 'CORE'].forEach(k => { GR[k] = new THREE.Group(); scene.add(GR[k]); });
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function label(text, w, h, bg = 'rgba(15,23,42,.85)', fg = '#e2e8f0') {
    const cv = document.createElement('canvas'), g = cv.getContext('2d'); cv.width = 320; cv.height = Math.round(320 * h / w);
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = 'rgba(148,163,184,.5)'; g.strokeRect(1, 1, cv.width - 2, cv.height - 2);
    g.fillStyle = fg; g.font = `600 ${Math.round(cv.height * 0.5)}px Inter, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2 + 1);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true })); sp.scale.set(w, h, 1); sp.renderOrder = 900; return sp;
}

/* ------------------------------------------------------------ x-ray building */
const shellMats = [];
function buildShell() {
    FLOORS.forEach(f => {
        const pts = WP[f], L = LEVEL[f], H = FH, g = GR[f];
        const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p.x, -p.z) : sh.moveTo(p.x, -p.z)); sh.closePath();
        const plate = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
        plate.rotation.x = -Math.PI / 2; plate.position.y = L; g.add(plate); shellMats.push([plate.material, 0.22]);
        const pos = [], lines = [];
        pts.forEach((a, i) => {
            const b = pts[(i + 1) % pts.length];
            pos.push(a.x, L, a.z, b.x, L, b.z, b.x, L + H, b.z, a.x, L, a.z, b.x, L + H, b.z, a.x, L + H, a.z);
            lines.push(a.x, L, a.z, b.x, L, b.z, a.x, L + H, a.z, b.x, L + H, b.z, a.x, L, a.z, a.x, L + H, a.z);
        });
        const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const walls = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })); g.add(walls); shellMats.push([walls.material, 0.1]);
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
        const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 })); g.add(ln); shellMats.push([ln.material, 1]);
    });
    // roof outline + site ground
    const rp_ = WP.F1, rl = [];
    rp_.forEach((a, i) => { const b = rp_[(i + 1) % rp_.length]; rl.push(a.x, LEVEL.ROOF, a.z, b.x, LEVEL.ROOF, b.z); });
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rl, 3));
    const ro = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.35 })); GR.ROOF.add(ro); shellMats.push([ro.material, 0.7]);
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ color: 0x14532d, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    gp.rotation.x = -Math.PI / 2; gp.position.set(2, 0.0, 4); GR.SITE.add(gp);
}

/* ------------------------------------------------------------ network data */
const SYS = { cold: { c: 0x38bdf8, r: 0.055 }, hot: { c: 0xf87171, r: 0.05 }, drain: { c: 0x9ca3af, r: 0.07 }, ext: { c: 0x2dd4bf, r: 0.07 } };
const RUNS = [], SEGS = [], FIX = [], SENS = [], CABLES = [];
let runId = 1;
function floorOfY(y) { if (y > 9.4) return 'ROOF'; for (let i = FLOORS.length - 1; i >= 0; i--) if (y >= LEVEL[FLOORS[i]] - 0.2) return FLOORS[i]; return 'BSMT'; }
function addRun(o) {
    const pts = o.pts.map(p => p.isVector3 ? p : V3(p[0], p[1], p[2])), cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const run = Object.assign({ id: runId++, pts, cum, len: cum[cum.length - 1], leak: null, flow: () => 0, floorKey: o.floor, feed: o.sys, r: SYS[o.sys].r }, o); run.pts = pts;
    run.segs = []; for (let i = 1; i < pts.length; i++) { if (pts[i].distanceTo(pts[i - 1]) < 0.02) continue; const s = { run, a: pts[i - 1], b: pts[i], i }; run.segs.push(s); SEGS.push(s); }
    RUNS.push(run); return run;
}
const pointAt = (run, d) => { d = clamp(d, 0, run.len); for (let i = 1; i < run.pts.length; i++) if (d <= run.cum[i] || i === run.pts.length - 1) { const t = (d - run.cum[i - 1]) / ((run.cum[i] - run.cum[i - 1]) || 1); return run.pts[i - 1].clone().lerp(run.pts[i], clamp(t, 0, 1)); } return run.pts[0].clone(); };
const man = (a, b, y) => [V3(a.x, y, a.z), V3(b.x, y, a.z), V3(b.x, y, b.z)];

let RISER, STACK, TANK, PLANT;
const ZONES = ['BSMT', 'GF', 'F1', 'F2'];
function buildNetwork() {
    // riser location: deepest point inside all four floor plans
    let best = null, bd = -1;
    for (let x = -12; x <= 16; x += 0.4) for (let z = -10; z <= 26; z += 0.4) {
        if (!FLOORS.every(f => inside(WP[f], x, z))) continue;
        const d = Math.min(...FLOORS.map(f => edgeDist(WP[f], x, z))); if (d > bd) { bd = d; best = { x, z }; }
    }
    RISER = best || { x: 4, z: 6 }; STACK = { x: RISER.x + 1.1, z: RISER.z };
    TANK = { x: 1.2, y: 11.2, z: -5.2, w: 2.4, h: 1.4, d: 1.7 };
    PLANT = { mainValve: V3(14, -0.8, 24.5), meter: V3(14, -0.8, 22.5), extTee: V3(14, -0.8, 18), sump: V3(11.5, -2.0, -8.5), pump: V3(9.2, -1.2, -8.5), tankValve: V3(RISER.x + 0.35, 10.2, RISER.z) };
    const cy = f => LEVEL[f] + FH - 0.22, hy = f => LEVEL[f] + FH - 0.36, top = LEVEL.ROOF + 0.55;
    const A = RISER;

    // --- mains + plant (outside / underground)
    addRun({ name: 'Mains supply line (street to plant)', sys: 'ext', zone: 'MAIN', floor: 'SITE', pts: [[14, -0.8, 30], [14, -0.8, 24.5], [14, -0.8, 18], [14, -0.8, -8.5], [PLANT.sump.x, -0.8, -8.5], [PLANT.sump.x, -1.4, -8.5]], flow: () => S.mainsFlow });
    addRun({ name: 'Pump suction', sys: 'cold', zone: 'MAIN', floor: 'SITE', pts: [[PLANT.sump.x - 1, -1.6, -8.5], [PLANT.pump.x, -1.6, -8.5], [PLANT.pump.x, -1.2, -8.5]], flow: () => S.pumpFlow });
    // --- pump discharge, up-riser, tank inlet
    addRun({ name: 'Pump discharge to riser', sys: 'cold', zone: 'LIFT', floor: 'SITE', pts: [[PLANT.pump.x, -1.2, -8.5], [PLANT.pump.x, -2.6, -8.5], [A.x, -2.6, -8.5], [A.x, -2.6, A.z]], flow: () => S.pumpFlow });
    FLOORS.forEach((f, i) => { const y0 = i === 0 ? -2.6 : cy(FLOORS[i - 1]), y1 = cy(f); addRun({ name: `Pumped riser (${FL[f]})`, sys: 'cold', zone: 'LIFT', floor: f, pts: [[A.x, y0, A.z], [A.x, y1, A.z]], flow: () => S.pumpFlow }); });
    addRun({ name: 'Pumped riser (roof) + tank inlet', sys: 'cold', zone: 'LIFT', floor: 'ROOF', pts: [[A.x, cy('F2'), A.z], [A.x, top, A.z], [TANK.x - 0.6, top, A.z], [TANK.x - 0.6, top, TANK.z], [TANK.x - 0.6, TANK.y + 0.2, TANK.z]], flow: () => S.pumpFlow });
    // --- tank outlet + distribution (down) riser
    const dx = A.x + 0.4;
    addRun({ name: 'Tank outlet to down-riser', sys: 'cold', zone: 'DIST', floor: 'ROOF', pts: [[TANK.x + 0.6, TANK.y - 0.7, TANK.z], [TANK.x + 0.6, 10.2, TANK.z], [dx, 10.2, TANK.z], [dx, 10.2, A.z], [dx, cy('F2'), A.z]], flow: () => S.distCold });
    ['F2', 'F1', 'GF', 'BSMT'].forEach((f, i, arr) => {
        const next = arr[i + 1], y1 = next ? cy(next) : -2.6, below = arr.slice(i);
        addRun({ name: `Cold down-riser (${FL[f]})`, sys: 'cold', zone: 'DIST', floor: f, pts: [[dx, cy(f), A.z], [dx, y1, A.z]], flow: () => below.reduce((s, k) => s + S.zf[k].cold, 0) });
    });
    // --- hot water: cylinder on the roof + hot riser
    const hx = A.x + 0.8;
    addRun({ name: 'Hot cylinder outlet to hot riser', sys: 'hot', zone: 'HOTR', floor: 'ROOF', pts: [[TANK.x + 4.2, 10.7, TANK.z], [TANK.x + 4.2, 10.2, TANK.z], [hx, 10.2, TANK.z], [hx, 10.2, A.z], [hx, hy('F2'), A.z]], flow: () => S.distHot });
    ['F2', 'F1', 'GF', 'BSMT'].forEach((f, i, arr) => {
        const next = arr[i + 1], y1 = next ? hy(next) : -2.8, below = arr.slice(i);
        addRun({ name: `Hot riser (${FL[f]})`, sys: 'hot', zone: 'HOTR', floor: f, pts: [[hx, hy(f), A.z], [hx, y1, A.z]], flow: () => below.reduce((s, k) => s + S.zf[k].hot, 0) });
    });
    addRun({ name: 'Hot cylinder cold feed', sys: 'cold', zone: 'DIST', floor: 'ROOF', pts: [[TANK.x + 0.6, 10.2, TANK.z], [TANK.x + 4.0, 10.2, TANK.z], [TANK.x + 4.0, 10.35, TANK.z]], flow: () => S.distHot });
    // --- soil stack
    const sx = STACK.x;
    ['F2', 'F1', 'GF', 'BSMT'].forEach((f, i, arr) => { const next = arr[i + 1]; addRun({ name: `Soil stack (${FL[f]})`, sys: 'drain', zone: 'DRAIN', floor: f, pts: [[sx, LEVEL[f] - 0.18, A.z], [sx, next ? LEVEL[next] - 0.18 : -3.3, A.z]], flow: () => arr.slice(0, i + 1).reduce((s, k) => s + S.zf[k].drain, 0) }); });
    addRun({ name: 'Sewer / septic outfall', sys: 'drain', zone: 'DRAIN', floor: 'SITE', pts: [[sx, -3.3, A.z], [sx, -3.3, -17], [11, -3.3, -17]], flow: () => S.drainTotal });

    // --- fixtures per wet room
    const TPL = {
        bath: [['WC', 'cold', 6, -0.9, -0.4, 0.45], ['Basin', 'both', 3, 0.2, -1.0, 0.9], ['Shower', 'both', 9, 1.0, 0.6, 1.0]],
        kitchen: [['Kitchen sink', 'both', 6, -0.8, 0, 0.9], ['Dishwasher', 'cold', 5, 0.8, 0.3, 0.5]],
        wetkitchen: [['Wet-kitchen sink', 'both', 6, -1.0, 0, 0.9], ['Washing machine', 'cold', 10, 0.9, 0.5, 0.5], ['Utility tap', 'cold', 6, 0.2, -1.0, 0.7]],
        sauna: [['Sauna heater / shower', 'cold', 3, 0, 0, 0.8]], bar: [['Bar sink', 'both', 4, 0, 0, 0.9]], tank: [['Poly-tank float feed', 'cold', 4, 0, 0, 0.8]]
    };
    const kindOf = n => /^(Ensuite|WC|Sho\. WC|WC \/ Sho\.)$/.test(n) || /Suite|Boy|Guest Bedroom|Master Bedroom/.test(n) ? 'bath' : /Wet Kitchen/.test(n) ? 'wetkitchen' : /Kitchen/.test(n) ? 'kitchenX' : /Sauna/.test(n) ? 'sauna' : n === 'Bar' ? 'bar' : null;
    let fid = 1; const roomSeq = {};
    FLOORS.forEach(f => {
        LABELS[f].forEach(([name, , a, b]) => {
            let k = kindOf(name); if (!k) return; if (k === 'kitchenX') k = 'kitchen';
            const p = rp(f, a, b), room = name; roomSeq[f] = (roomSeq[f] || 0) + 1;
            const fx = TPL[k].map(([type, uses, lpm, ox, oz, h]) => ({ id: fid++, type, uses, lpm, room, floor: f, k, pos: V3(p.x + ox, LEVEL[f] + h, p.z + oz), floorPos: V3(p.x + ox, LEVEL[f], p.z + oz), use: 0, runFor: 0 }));
            fx.forEach(x => FIX.push(x));
            const hasHot = fx.some(x => x.uses === 'both'), zone = 'Z-' + f, c0 = V3(A.x + 0.4, cy(f), A.z), rm = V3(p.x, 0, p.z);
            const trunk = (sys, y, start) => { const m = man(start, rm, y); return [V3(start.x, y, start.z), m[1], m[2]]; };
            const flowRoom = which => () => fx.reduce((s, x) => s + (x.use > 0 && (which === 'cold' ? true : x.uses === 'both') ? x.lpm : 0), 0);
            addRun({ name: `${FL[f]} · ${room} · cold feed`, sys: 'cold', zone, floor: f, room, pts: trunk('cold', cy(f), c0), flow: flowRoom('cold') });
            if (hasHot) addRun({ name: `${FL[f]} · ${room} · hot feed`, sys: 'hot', zone, floor: f, room, pts: trunk('hot', hy(f), V3(A.x + 0.8, hy(f), A.z)), flow: flowRoom('hot') });
            fx.forEach(x => {
                addRun({ name: `${FL[f]} · ${room} · ${x.type} cold drop`, sys: 'cold', zone, floor: f, room, pts: [V3(rm.x, cy(f), rm.z), V3(x.pos.x, cy(f), rm.z), V3(x.pos.x, cy(f), x.pos.z), V3(x.pos.x, x.pos.y, x.pos.z)], flow: () => x.use > 0 ? x.lpm : 0, fix: x });
                if (x.uses === 'both') addRun({ name: `${FL[f]} · ${room} · ${x.type} hot drop`, sys: 'hot', zone, floor: f, room, pts: [V3(rm.x, hy(f), rm.z), V3(x.pos.x + 0.12, hy(f), rm.z), V3(x.pos.x + 0.12, hy(f), x.pos.z), V3(x.pos.x + 0.12, x.pos.y, x.pos.z)], flow: () => x.use > 0 ? x.lpm : 0, fix: x });
                const dy = LEVEL[f] - 0.18;
                addRun({ name: `${FL[f]} · ${room} · ${x.type} waste`, sys: 'drain', zone: 'DRAIN', floor: f, room, pts: [V3(x.pos.x, x.pos.y, x.pos.z), V3(x.pos.x, dy, x.pos.z), V3(STACK.x, dy, x.pos.z), V3(STACK.x, dy, A.z)], flow: () => x.use > 0 ? x.lpm : 0, fix: x });
            });
        });
    });
    // --- pool fill + irrigation (outside, from the mains tee)
    const pool = IP('GF', 130, 600);
    addRun({ name: 'Pool top-up line', sys: 'ext', zone: 'EXT', floor: 'SITE', pts: [PLANT.extTee, V3(pool.x, -0.8, PLANT.extTee.z), V3(pool.x, -0.8, pool.z), V3(pool.x, -0.25, pool.z)], flow: () => S.poolFlow, poolFix: true });
    addRun({ name: 'Irrigation main', sys: 'ext', zone: 'EXT', floor: 'SITE', pts: [PLANT.extTee, V3(20, -0.5, 18), V3(20, -0.5, 6), V3(18, -0.5, -3)], flow: () => S.irrFlow });
    addRun({ name: 'Irrigation lawn loop', sys: 'ext', zone: 'EXT', floor: 'SITE', pts: [V3(-8, -0.5, 24), V3(-14, -0.5, 24), V3(-14, -0.5, 8), V3(-12, -0.5, -4)], flow: () => S.irrFlow });
    addRun({ name: 'Irrigation link', sys: 'ext', zone: 'EXT', floor: 'SITE', pts: [PLANT.extTee, V3(-8, -0.5, 18), V3(-8, -0.5, 24)], flow: () => S.irrFlow });
    FIX.push({ id: fid++, type: 'Pool top-up valve', uses: 'ext', lpm: 40, room: 'Pool', floor: 'SITE', pos: V3(pool.x, -0.25, pool.z), floorPos: V3(pool.x, 0, pool.z), use: 0, k: 'pool' });
    FIX.push({ id: fid++, type: 'Irrigation sprinklers', uses: 'ext', lpm: 30, room: 'Lawn', floor: 'SITE', pos: V3(-12, -0.5, 6), floorPos: V3(-12, 0, 6), use: 0, k: 'irr' });
    // roof float feed
    window.__pool = pool;
}

/* ------------------------------------------------------------ render pipes (instanced) */
const IM = {}, tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpC = new THREE.Color(), UPY = V3(0, 1, 0);
function buildPipeMeshes() {
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1), groups = {};
    SEGS.forEach(s => { const k = s.run.feed + '|' + s.run.floorKey; (groups[k] = groups[k] || []).push(s); });
    Object.entries(groups).forEach(([k, list]) => {
        const [sys, fk] = k.split('|'), m = new THREE.InstancedMesh(cyl, new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
        list.forEach((s, i) => {
            const d = s.b.clone().sub(s.a), len = d.length(); tmpQ.setFromUnitVectors(UPY, d.normalize());
            tmpM.compose(s.a.clone().add(s.b).multiplyScalar(0.5), tmpQ, V3(s.run.r, len, s.run.r)); m.setMatrixAt(i, tmpM); m.setColorAt(i, tmpC.setHex(SYS[sys].c)); s.inst = m; s.idx = i;
        });
        m.instanceColor.needsUpdate = true; m.userData = { sys, fk }; (GR[fk] || GR.CORE).add(m); (IM[sys] = IM[sys] || []).push(m);
    });
}
const COLOR_OFF = new THREE.Color(0x475569);
function paintRun(run, mode) { // mode: 'base' | 'leak' | 'sel' | 'idle'
    const base = tmpC.setHex(SYS[run.feed].c).clone();
    const col = mode === 'leak' ? new THREE.Color(0xf43f5e) : mode === 'sel' ? new THREE.Color(0xfacc15) : mode === 'idle' ? base.lerp(COLOR_OFF, 0.65) : base;
    run.segs.forEach(s => { s.inst.setColorAt(s.idx, col); s.inst.instanceColor.needsUpdate = true; });
}

/* ------------------------------------------------------------ devices: valves, meters, tank, pump, sensors, cables */
const VALVES = {}, DEV = [];
function addValve(id, name, pos, floorKey, opts = {}) {
    const g = new THREE.Group(); g.position.copy(pos);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: 0x1f2937 })); g.add(body);
    const act = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10), new THREE.MeshBasicMaterial({ color: 0x22c55e })); act.position.y = 0.26; g.add(act);
    const lab = label(name, 1.5, 0.3); lab.position.y = 0.8; g.add(lab); (GR[floorKey] || GR.CORE).add(g); DEV.push(g);
    VALVES[id] = Object.assign({ id, name, open: true, g, act, floorKey, pos: pos.clone(), fault: false }, opts); return VALVES[id];
}
const labelGroups = [], roomLabelObjs = [];
let tankMesh, tankWater, pumpMesh, pumpLed, sumpWater, cylMesh, heaterGlow;
function buildDevices() {
    addValve('V-MAIN', 'Main valve', PLANT.mainValve, 'SITE', { zone: 'MAIN', ctrl: 'Loxone Nano relay + motor valve' });
    const RN = n => RUNS.find(r => r.name === n), leg = (r, i) => r.pts[i].clone().lerp(r.pts[i + 1], 0.5);
    addValve('V-EXT', 'Pool + irrigation valve', PLANT.extTee.clone().add(V3(0, 0.0, 0.6)), 'SITE', { zone: 'EXT' });
    addValve('V-TANK', 'Tank outlet valve', leg(RN('Tank outlet to down-riser'), 2), 'ROOF', { zone: 'DIST' });
    addValve('V-HOT', 'Hot water valve', leg(RN('Hot cylinder outlet to hot riser'), 2), 'ROOF', { zone: 'HOTR' });
    FLOORS.forEach(f => addValve('V-' + f, `Zone valve ${f}`, pointAt(RN(`Cold down-riser (${FL[f]})`), 0.4), f, { zone: 'Z-' + f }));
    // flow meters + pressure sensors
    const mk = (name, pos, fk, col) => { const g = new THREE.Group(); g.position.copy(pos); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 14), new THREE.MeshBasicMaterial({ color: col })); m.rotation.z = Math.PI / 2; g.add(m); const l = label(name, 1.6, 0.3); l.position.y = 0.7; g.add(l); (GR[fk] || GR.CORE).add(g); DEV.push(g); return g; };
    mk('Mains flow meter', PLANT.meter, 'SITE', 0x22d3ee); mk('Distribution flow + pressure', pointAt(RUNS.find(r => r.name === 'Cold down-riser (Second floor)'), 1.2), 'ROOF', 0xa78bfa);
    // sump, pump
    sumpWater = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.4), new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.4 })); sumpWater.position.copy(PLANT.sump); GR.SITE.add(sumpWater);
    const sumpBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.3, 1.6, 1.5)), new THREE.LineBasicMaterial({ color: 0x7dd3fc })); sumpBox.position.set(PLANT.sump.x, PLANT.sump.y + 0.1, PLANT.sump.z); GR.SITE.add(sumpBox);
    const sl = label('Underground sump', 1.6, 0.3); sl.position.set(PLANT.sump.x, -0.2, PLANT.sump.z); GR.SITE.add(sl);
    pumpMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 14), new THREE.MeshLambertMaterial({ color: 0x334155 })); pumpMesh.position.copy(PLANT.pump); pumpMesh.rotation.z = Math.PI / 2; GR.SITE.add(pumpMesh);
    pumpLed = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x64748b })); pumpLed.position.set(PLANT.pump.x, PLANT.pump.y + 0.45, PLANT.pump.z); GR.SITE.add(pumpLed);
    const pl = label('Booster pump', 1.3, 0.3); pl.position.set(PLANT.pump.x, PLANT.pump.y + 1, PLANT.pump.z); GR.SITE.add(pl);
    // roof tank
    tankMesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)), new THREE.LineBasicMaterial({ color: 0x7dd3fc })); tankMesh.position.set(TANK.x, TANK.y, TANK.z); GR.ROOF.add(tankMesh);
    tankWater = new THREE.Mesh(new THREE.BoxGeometry(TANK.w - 0.06, TANK.h - 0.06, TANK.d - 0.06), new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.45 })); tankWater.position.set(TANK.x, TANK.y, TANK.z); GR.ROOF.add(tankWater);
    const tl = label('Roof water tank 5 000 L', 1.9, 0.32); tl.position.set(TANK.x, TANK.y + 1.2, TANK.z); GR.ROOF.add(tl);
    cylMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 16), new THREE.MeshLambertMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.8 })); cylMesh.position.set(TANK.x + 4.2, 11.0, TANK.z); GR.ROOF.add(cylMesh);
    const cl = label('Hot water cylinder', 1.7, 0.3); cl.position.set(TANK.x + 4.2, 12.0, TANK.z); GR.ROOF.add(cl);
    // riser labels
    [['Cold riser', RISER.x + 0.4, 0xbae6fd], ['Pumped riser', RISER.x, 0xbae6fd], ['Hot riser', RISER.x + 0.8, 0xfecaca], ['Soil stack', STACK.x, 0xd1d5db]].forEach(([t, x], i) => { const l = label(t, 1.2, 0.26); l.position.set(x, LEVEL.F2 + FH + 0.9 + (i % 2) * 0.5, RISER.z - 0.5); GR.CORE.add(l); });
    // plant cabinet label + room labels
    const pc = label('Plant: mains valve, meter, sump, pump', 3.2, 0.34); pc.position.set(12, 0.8, 8); GR.SITE.add(pc);
    FLOORS.forEach(f => LABELS[f].forEach(([n, , a, b]) => { const p = rp(f, a, b), l = label(n, 1.5, 0.28, 'rgba(15,23,42,.6)', '#cbd5e1'); l.position.set(p.x, LEVEL[f] + 2.3, p.z); GR[f].add(l); roomLabelObjs.push(l); }));
}
/* ---- terminals: fixtures, equipment, sprinklers, end caps, so no pipe end is left hanging */
const NODES = [];
function dseg(p, a, b) { const ab = b.clone().sub(a), t = clamp(p.clone().sub(a).dot(ab) / (ab.lengthSq() || 1), 0, 1); return a.clone().add(ab.multiplyScalar(t)).distanceTo(p); }
function connected(p, self) { return NODES.some(n => n.p.distanceTo(p) <= n.r) || RUNS.some(r => r !== self && r.pts.some((q, i) => i && dseg(p, r.pts[i - 1], q) < 0.2)); }
function danglingEnds() { const out = []; RUNS.forEach(r => [r.pts[0], r.pts[r.pts.length - 1]].forEach((p, k) => { if (!connected(p, r)) out.push({ r, p, end: k ? 'end' : 'start' }); })); return out; }
function buildTerminals() {
    const mat = c => new THREE.MeshLambertMaterial({ color: c }), box = (w, h, d, c, p, g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.copy(p); g.add(m); return m; };
    FIX.forEach(x => { if (x.uses === 'ext') return; box(0.42, 0.3, 0.42, /Shower/.test(x.type) ? 0x93c5fd : /Washing|Dish/.test(x.type) ? 0xcbd5e1 : 0xf1f5f9, x.pos, GR[x.floor] || GR.CORE); NODES.push({ p: x.pos.clone(), r: 0.5 }); });
    const eq = (p, r) => NODES.push({ p: p.clone(), r });
    eq(PLANT.sump, 1.6); eq(PLANT.pump, 0.7); eq(V3(TANK.x, TANK.y, TANK.z), 1.5); eq(V3(TANK.x + 4.2, 11.0, TANK.z), 0.9);
    const street = V3(14, -0.8, 30); box(0.5, 0.5, 0.5, 0x0ea5e9, street, GR.SITE); eq(street, 0.6); const sl = label('Street water main', 1.5, 0.3); sl.position.set(14, 0.5, 30.2); GR.SITE.add(sl);
    const sep = V3(11, -3.3, -17), sg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 1.6, 2)), new THREE.LineBasicMaterial({ color: 0x9ca3af })); sg.position.copy(sep); GR.SITE.add(sg); eq(sep, 1.4); const spl = label('Septic tank / sewer', 1.6, 0.3); spl.position.set(11, -1.9, -17); GR.SITE.add(spl);
    const pool = window.__pool; eq(V3(pool.x, -0.25, pool.z), 1.0); const pn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.25, 10), mat(0x2dd4bf)); pn.position.set(pool.x, -0.1, pool.z); GR.SITE.add(pn);
    ['Irrigation main', 'Irrigation lawn loop'].forEach(n => { const r = RUNS.find(x => x.name === n), e = r.pts[r.pts.length - 1], h = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), mat(0x2dd4bf)); h.position.set(e.x, e.y + 0.2, e.z); GR.SITE.add(h); eq(e, 0.45); });
    // anything still free-ended (dead legs at the bottom of risers etc.) gets a visible end cap
    danglingEnds().forEach(d => { const m = new THREE.Mesh(new THREE.SphereGeometry(d.r.r * 1.7, 10, 8), mat(SYS[d.r.feed].c)); m.position.copy(d.p); (GR[d.r.floorKey] || GR.CORE).add(m); eq(d.p, 0.3); });
}
const SENSOR_STATE = { dry: 0x22c55e, wet: 0xf43f5e, fault: 0xfbbf24, offline: 0x64748b };
function addSensor(o) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14), new THREE.MeshBasicMaterial({ color: SENSOR_STATE.dry })); m.position.copy(o.pos); (GR[o.floor] || GR.CORE).add(m);
    const s = Object.assign({ state: 'dry', battery: 70 + Math.floor(Math.random() * 30), mesh: m, tripAt: null, id: 'LS-' + (SENS.length + 1) }, o); SENS.push(s); return s;
}
function buildSensors() {
    FIX.filter(x => ['bath', 'kitchen', 'wetkitchen', 'sauna', 'bar'].includes(x.k)).forEach(x => { if (!SENS.some(s => s.room === x.room && s.floor === x.floor && s.pos.distanceTo(x.floorPos) < 1.7)) addSensor({ floor: x.floor, room: x.room, zone: 'Z-' + x.floor, act: ['V-' + x.floor], pos: x.floorPos.clone().setY(LEVEL[x.floor] + 0.04), kind: 'Wireless leak sensor' }); });
    addSensor({ floor: 'SITE', room: 'Sump / pump pit', zone: 'MAIN', act: ['PUMP', 'V-MAIN'], pos: V3(PLANT.pump.x, 0.04, PLANT.pump.z + 1.2), kind: 'Wired probe (plant)' });
    addSensor({ floor: 'SITE', room: 'Meter chamber', zone: 'MAIN', act: ['V-MAIN'], pos: V3(PLANT.meter.x - 0.8, 0.04, PLANT.meter.z), kind: 'Wired probe (plant)' });
    addSensor({ floor: 'SITE', room: 'Pool plant', zone: 'EXT', act: ['V-EXT'], pos: V3(window.__pool.x + 1.5, 0.04, window.__pool.z), kind: 'Wired probe (plant)' });
    addSensor({ floor: 'ROOF', room: 'Roof tank bund', zone: 'DIST', act: ['PUMP', 'V-TANK'], pos: V3(TANK.x, LEVEL.ROOF + 0.04, TANK.z + 1.3), kind: 'Wired probe (roof)' });
    addSensor({ floor: 'ROOF', room: 'Hot cylinder tray', zone: 'HOTR', act: ['V-HOT'], pos: V3(TANK.x + 4.2, LEVEL.ROOF + 0.04, TANK.z + 0.9), kind: 'Wired probe (roof)' });
    addSensor({ floor: 'ROOF', room: 'Tank high-level float', zone: 'LIFT', act: ['PUMP', 'V-MAIN'], pos: V3(TANK.x - 0.9, TANK.y + 0.6, TANK.z + 0.5), kind: 'Float switch', special: 'float' });
}
/* Leak-sensing probe cables run ALONGSIDE the pipes (out along each pipe and back), so a leak at any point of a covered pipe wets the
   cable. Each cable is a polyline; the controller reports the distance along the cable, which maps back to one exact spot. */
const CABLE_OFF = V3(0.1, 0, 0.1);
function chainPath(runLists) { // runLists: arrays of consecutive runs; each is walked out along the pipes and back again
    const out = [], add = p => { const l = out[out.length - 1]; if (!l || l.distanceTo(p) > 0.01) out.push(p.clone()); };
    runLists.forEach(list => { list.forEach(r => r.pts.forEach(p => add(p.clone().add(CABLE_OFF)))); [...list].reverse().forEach(r => [...r.pts].reverse().forEach(p => add(p.clone().sub(CABLE_OFF)))); });
    return out;
}
function drawCable(c) {
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1), segs = []; for (let i = 1; i < c.pts.length; i++) if (c.pts[i].distanceTo(c.pts[i - 1]) > 0.02) segs.push([c.pts[i - 1], c.pts[i]]);
    c.mat = new THREE.MeshBasicMaterial({ color: 0xffffff }); const m = new THREE.InstancedMesh(cyl, c.mat, segs.length); c.base = new THREE.Color(0xe879f9);
    segs.forEach(([a, b], i) => { const d = b.clone().sub(a), l = d.length(); tmpQ.setFromUnitVectors(UPY, d.normalize()); tmpM.compose(a.clone().add(b).multiplyScalar(0.5), tmpQ, V3(0.05, l, 0.05)); m.setMatrixAt(i, tmpM); m.setColorAt(i, c.base); });
    m.instanceColor.needsUpdate = true; m.frustumCulled = false; c.inst = m; c.nseg = segs.length; c.group.add(m);
    for (let d = 10; d < c.len; d += 10) { const p = cablePoint(c, d), t = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); t.position.copy(p); c.group.add(t); if (d % 20 === 0) { const l = label(d + ' m', 0.5, 0.2, 'rgba(15,23,42,.8)', '#5eead4'); l.position.set(p.x, p.y + 0.3, p.z); c.group.add(l); } }
}
function tintCable(c, hex) { const col = new THREE.Color(hex); for (let i = 0; i < c.nseg; i++) c.inst.setColorAt(i, col); c.inst.instanceColor.needsUpdate = true; }
function buildCables() {
    const byRoom = {}; RUNS.forEach(r => { if (r.zone && r.zone.startsWith('Z-') && (r.feed === 'cold' || r.feed === 'hot')) { const k = r.floorKey + '|' + r.room; (byRoom[k] = byRoom[k] || []).push(r); } });
    const A = RISER;
    FLOORS.forEach(f => {
        // per wet room: out along the cold trunk, round every drop (ceiling leg + drop + back), then back along the trunk
        const lists = []; Object.entries(byRoom).filter(([k]) => k.startsWith(f + '|')).forEach(([k, rs]) => {
            const trunk = rs.find(r => /cold feed$/.test(r.name)), drops = rs.filter(r => r.fix); if (!trunk) return;
            const pts = [...trunk.pts]; drops.forEach(d => { pts.push(d.pts[0].clone().setY(d.pts[0].y)); pts.push(...d.pts, d.pts[0].clone()); }); pts.push(trunk.pts[trunk.pts.length - 1]);
            lists.push({ pts });
        });
        const path = []; const add = p => { const l = path[path.length - 1]; if (!l || l.distanceTo(p) > 0.01) path.push(p.clone()); };
        lists.forEach(L => { L.pts.forEach(p => add(p.clone().add(CABLE_OFF))); [...L.pts].reverse().forEach(p => add(p.clone().sub(CABLE_OFF))); });
        if (path.length > 1) mkCable('TT-' + f, f, 'TTSIM-' + f, `${FL[f]} branches (cold + hot trunks and drops)`, path, ['V-' + f], f);
    });
    const R = n => RUNS.filter(r => r.zone === n);
    mkCable('TT-LIFT', 'CORE', 'TTSIM-RISER', 'Pump discharge + pumped riser + tank inlet', chainPath([R('LIFT').concat(RUNS.filter(r => r.name === 'Pump discharge to riser')).filter((r, i, a) => a.indexOf(r) === i)]), ['PUMP'], 'CORE');
    mkCable('TT-DIST', 'CORE', 'TTSIM-RISER', 'Tank outlet + cold down-riser', chainPath([R('DIST')]), ['V-TANK'], 'CORE');
    mkCable('TT-HOT', 'CORE', 'TTSIM-RISER', 'Hot cylinder outlet + hot riser', chainPath([R('HOTR')]), ['V-HOT'], 'CORE');
    mkCable('TT-MAIN', 'SITE', 'TTDM-128 (plant)', 'Street mains + pump suction (buried)', chainPath([R('MAIN')]), ['V-MAIN'], 'SITE');
    const ext = R('EXT'); mkCable('TT-EXT', 'SITE', 'TTSIM-EXT', 'Pool top-up + irrigation lines', chainPath([[ext[0]], [ext[1]], [ext[3], ext[2]]]), ['V-EXT'], 'SITE');
}
function mkCable(id, floor, ctrl, name, pts, act, group) {
    if (pts.length < 2) return; const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const c = { id, floor, ctrl, name, pts, cum, len: cum[cum.length - 1], alarms: [], broken: null, act, group: new THREE.Group() };
    drawCable(c); GR[group].add(c.group); CABLES.push(c);
}
function cablePoint(c, d) { d = clamp(d, 0, c.len); for (let i = 1; i < c.pts.length; i++) if (d <= c.cum[i] || i === c.pts.length - 1) { const t = (d - c.cum[i - 1]) / ((c.cum[i] - c.cum[i - 1]) || 1); return c.pts[i - 1].clone().lerp(c.pts[i], clamp(t, 0, 1)); } return c.pts[0].clone(); }
function cableNearest(c, p) { let best = { d: 1e9, at: 0 }; for (let i = 1; i < c.pts.length; i++) { const a = c.pts[i - 1], b = c.pts[i], ab = b.clone().sub(a), l2 = ab.lengthSq() || 1, t = clamp(p.clone().sub(a).dot(ab) / l2, 0, 1), q = a.clone().add(ab.multiplyScalar(t)), dd = q.distanceTo(p); if (dd < best.d) best = { d: dd, at: c.cum[i - 1] + t * (c.cum[i] - c.cum[i - 1]), q }; } return best; }

/* ------------------------------------------------------------ flow beads */
let beads, beadN = 0; const BEAD_MAX = 700;
function buildBeads() { beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), BEAD_MAX); beads.frustumCulled = false; beads.count = 0; scene.add(beads); }
const BEAD_COL = { cold: new THREE.Color(0xe0f2fe), hot: new THREE.Color(0xfff1f2), drain: new THREE.Color(0xe5e7eb), ext: new THREE.Color(0xccfbf1) };
function updateBeads(t) {
    if (!$('L-flow').checked) { beads.count = 0; return; }
    let n = 0;
    for (const r of RUNS) {
        if (n >= BEAD_MAX - 12 || !isLayerOn(r) || !floorVisible(r.floorKey)) continue;
        const f = r.activeFlow; if (!(f > 0.04)) continue;
        const k = clamp(Math.round(r.len / 1.3), 1, 10), speed = 0.5 + Math.min(f, 40) * 0.035;
        for (let i = 0; i < k && n < BEAD_MAX; i++) { const p = pointAt(r, (((t * speed) / r.len) + i / k) % 1 * r.len); tmpM.makeTranslation(p.x, p.y, p.z); beads.setMatrixAt(n, tmpM); beads.setColorAt(n, BEAD_COL[r.feed]); n++; }
    }
    beads.count = n; beads.instanceMatrix.needsUpdate = true; if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
}

/* ------------------------------------------------------------ simulation state */
const S = {
    t: 14 * 3600, scale: 1, day: 0, away: false, activity: true, mainsOn: true,
    tank: 3600, tankCap: 5000, sump: 2200, sumpCap: 3000, pumpOn: false, pumpEnabled: true, pumpFlow: 0, mainsFlow: 0, distCold: 0, distHot: 0, distTotal: 0, poolFlow: 0, irrFlow: 0, drainTotal: 0, floatStuck: false,
    pressure: 3.6, pHist: [], zf: {}, consumedToday: 0, lost: 0, leaks: [], nextLeak: 1, alarms: [], cont: 0, sweep: null, trouble: [], ack: false,
    cfg: { auto: true, strategy: 'zone', delay: 3, burst: 20, dayMax: 60, nightMin: 15, nightFrom: 23, nightTo: 5, meterRes: 0.5, spot: true, cable: true, notify: true, siren: true, lights: true, pDrop: 0.5 }
};
FLOORS.forEach(f => { S.zf[f] = { cold: 0, hot: 0, drain: 0 }; });
const isNight = () => { const h = (S.t / 3600) % 24, a = S.cfg.nightFrom, b = S.cfg.nightTo; return a > b ? (h >= a || h < b) : (h >= a && h < b); };
const clockStr = () => { const s = Math.floor(S.t) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

/* ---- chains: is a run supplied with water? */
function zoneSupplied(run) {
    const z = run.zone, V = VALVES, tankOk = S.tank > 1;
    if (z === 'MAIN') return V['V-MAIN'].open && S.mainsOn;
    if (z === 'LIFT') return S.pumpFlow > 0.5;
    if (z === 'DIST') return V['V-TANK'].open && tankOk;
    if (z === 'HOTR') return V['V-HOT'].open && V['V-TANK'].open && tankOk;
    if (z === 'EXT') return V['V-EXT'].open && V['V-MAIN'].open && S.mainsOn;
    if (z === 'DRAIN') return true;
    const f = z.slice(2); if (!V['V-' + f].open || !V['V-TANK'].open || !tankOk) return false;
    return run.feed === 'hot' ? V['V-HOT'].open : true;
}

/* ------------------------------------------------------------ leaks */
const SEV = { drip: { lpm: 0.05, name: 'Slow drip (3 L/h)' }, weep: { lpm: 0.5, name: 'Weeping joint (30 L/h)' }, spray: { lpm: 5, name: 'Spraying fitting (5 L/min)' }, burst: { lpm: 25, name: 'Burst pipe (25 L/min)' } };
const leakGroup = new THREE.Group(); scene.add(leakGroup);
function roomNear(f, p) { const list = LABELS[f]; if (!list) return FL[f] || 'Outside'; let b = null, bd = 1e9; list.forEach(([n, , a, c]) => { const w = rp(f, a, c), d = Math.hypot(w.x - p.x, w.z - p.z); if (d < bd) { bd = d; b = n; } }); return bd > 7 ? FL[f] : b; }
function spawnLeak(run, d, sev, opts = {}) {
    const p = pointAt(run, d), fl = floorOfY(p.y), onSite = run.floorKey === 'SITE', fk = onSite ? 'SITE' : (run.floorKey === 'ROOF' ? 'ROOF' : fl);
    const gy = onSite ? 0 : fk === 'ROOF' ? LEVEL.ROOF : LEVEL[fk];
    const L = { id: S.nextLeak++, run, d, sev, kind: opts.kind || 'pipe', rate0: opts.rate || SEV[sev].lpm, pos: p, floor: fk, gy, room: opts.room || (onSite ? (p.x > 8 ? 'Plant / mains' : 'Garden') : roomNear(fk, p)), vol: 0, t0: S.t, detected: null, isolated: null, rate: 0, wet: new Set(), puddle: null, stain: null, spray: null, repaired: false };
    const pud = new THREE.Mesh(new THREE.CircleGeometry(1, 36), new THREE.MeshBasicMaterial({ color: onSite ? 0x78350f : 0x38bdf8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })); pud.rotation.x = -Math.PI / 2; pud.position.set(p.x, gy + 0.03, p.z); pud.scale.setScalar(0.01); leakGroup.add(pud); L.puddle = pud;
    const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x92400e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); stain.rotation.x = Math.PI / 2; stain.visible = false; leakGroup.add(stain); L.stain = stain;
    const sp = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.1, transparent: true, opacity: 0.9, depthWrite: false })); const N = 60, arr = new Float32Array(N * 3), vel = []; for (let i = 0; i < N; i++) vel.push([(Math.random() - 0.5) * 1.5, Math.random() * 2, (Math.random() - 0.5) * 1.5, Math.random()]);
    sp.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3)); sp.frustumCulled = false; leakGroup.add(sp); L.spray = { pts: sp, vel, arr };
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 40), new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, depthTest: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, gy + 0.08, p.z); ring.renderOrder = 950; leakGroup.add(ring); L.ring = ring;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(p.x, gy + 3, p.z); leakGroup.add(beam); L.beam = beam;
    const lab = label('LEAK L' + L.id, 1.2, 0.3, 'rgba(127,29,29,.92)', '#fff'); lab.position.set(p.x, gy + 2.4, p.z); leakGroup.add(lab); L.lab = lab;
    S.leaks.push(L); run.leak = L; paintRun(run, 'leak');
    log(`Leak L${L.id} injected: ${run.name} @ ${d.toFixed(1)} m, ${SEV[sev].name}, ${L.room}`, 'w'); refreshUI(); return L;
}
function removeLeak(L) { CABLES.forEach(cb => { cb.alarms.filter(a => a.leak === L).forEach(a => leakGroup.remove(a.lab)); cb.alarms = cb.alarms.filter(a => a.leak !== L); if (!cb.alarms.length) tintCable(cb, cb.broken ? 0xfb923c : 0xe879f9); });
    [L.puddle, L.stain, L.spray.pts, L.ring, L.beam, L.lab].forEach(o => { leakGroup.remove(o); if (o.geometry) o.geometry.dispose(); }); S.leaks = S.leaks.filter(x => x !== L); if (L.run.leak === L) { L.run.leak = null; paintRun(L.run, 'base'); } }
function repairLeak(L) { log(`Leak L${L.id} repaired by plumber (${L.vol.toFixed(1)} L lost)`, 'g'); removeLeak(L); refreshUI(); }
function leakRate(L) {
    if (L.repaired) return 0; const r = L.run; let active;
    if (L.kind === 'overflow') active = S.pumpFlow > 0.5 && S.floatStuck; else active = zoneSupplied(r);
    if (!active) return 0; const pf = r.zone === 'MAIN' || r.zone === 'EXT' ? 1 : Math.sqrt(clamp(S.pressure, 0.3, 4) / 3.5);
    return L.rate0 * pf;
}

/* ------------------------------------------------------------ tick: physics */
let hh = 0;
function physics(dt) { // dt in sim seconds
    // fixture usage
    const randomUse = S.activity && !S.away && !(S.sweep) && (!isNight() || Math.random() < 0.0004 * dt);
    if (randomUse && FIX.length && Math.random() < Math.min(0.5, 0.045 * dt) && FIX.filter(x => x.use > 0 && !x.manual).length < 2) { const x = FIX[Math.floor(Math.random() * (FIX.length - 2))]; if (x.use <= 0 && x.k !== 'tank') { x.use = 25 + Math.random() * 90; x.manual = false; } }
    FIX.forEach(x => { if (x.use > 0 && !x.manual) x.use -= dt; if (x.manual && x.use > 0) x.use = 999999; });
    // supplied demand per zone
    const V = VALVES; Object.values(S.zf).forEach(z => { z.cold = z.hot = z.drain = 0; });
    let poolF = 0, irrF = 0;
    const tankOk = S.tank > 1;
    FIX.forEach(x => {
        if (!(x.use > 0)) { x.flow = 0; return; }
        if (x.uses === 'ext') { const ok = V['V-EXT'].open && V['V-MAIN'].open && S.mainsOn; x.flow = ok ? x.lpm : 0; if (x.k === 'pool') poolF += x.flow; else irrF += x.flow; return; }
        const f = x.floor, ok = V['V-' + f].open && V['V-TANK'].open && tankOk; x.flow = ok ? x.lpm : 0; if (!ok) return;
        if (x.uses === 'both' && !(V['V-HOT'].open)) { x.flow = x.lpm * 0.5; S.zf[f].cold += x.flow; S.zf[f].drain += x.flow; return; }
        if (x.uses === 'both') { S.zf[f].cold += x.flow * 0.5; S.zf[f].hot += x.flow * 0.5; } else S.zf[f].cold += x.flow; S.zf[f].drain += x.flow;
    });
    S.poolFlow = poolF; S.irrFlow = irrF;
    // leaks
    S.pressure = S.pressure || 3.6;
    let leakCold = 0, leakHot = 0, leakExt = 0, leakMain = 0, leakLift = 0, leakDrain = 0;
    S.leaks.forEach(L => {
        L.rate = leakRate(L); const lit = L.rate * dt / 60; L.vol += lit; S.lost += lit;
        const r = L.run, z = r.zone; if (z === 'EXT') leakExt += L.rate; else if (z === 'MAIN') leakMain += L.rate; else if (z === 'LIFT') leakLift += L.rate;
        else if (z === 'DRAIN') leakDrain += L.rate; else if (r.feed === 'hot') leakHot += L.rate; else leakCold += L.rate;
        if (z.startsWith('Z-') && L.rate > 0) { /* attribute to zone for riser sums */ const f = z.slice(2); (r.feed === 'hot' ? (S.zf[f].hot += L.rate) : (S.zf[f].cold += L.rate)); }
    });
    // distribution flow = everything drawn from the tank (cold + hot via cylinder) + leaks downstream of the tank
    const zc = Object.values(S.zf).reduce((s, z) => s + z.cold + z.hot, 0);
    let riserLeak = 0; S.leaks.forEach(L => { if (['DIST', 'HOTR'].includes(L.run.zone)) riserLeak += L.rate; });
    S.distCold = Object.values(S.zf).reduce((s, z) => s + z.cold, 0) + S.leaks.filter(L => L.run.zone === 'DIST').reduce((s, L) => s + L.rate, 0);
    S.distHot = Object.values(S.zf).reduce((s, z) => s + z.hot, 0) + S.leaks.filter(L => L.run.zone === 'HOTR').reduce((s, L) => s + L.rate, 0);
    S.distTotal = zc + riserLeak; S.drainTotal = Object.values(S.zf).reduce((s, z) => s + z.drain, 0) + leakDrain;
    S.tank = clamp(S.tank - S.distTotal * dt / 60, 0, S.tankCap);
    // tank float + pump
    const lvl = S.tank / S.tankCap;
    if (S.pumpEnabled && V['V-MAIN'].open && S.mainsOn && S.sump > 20 && !S.pumpLock) { if (lvl < 0.35) S.pumpOn = true; if (lvl > 0.92 && !S.floatStuck) S.pumpOn = false; } else S.pumpOn = false;
    if (S.pumpOn && S.floatStuck && lvl >= 1 && !S.leaks.some(l => l.kind === 'overflow')) { const run = RUNS.find(r => r.name.startsWith('Pumped riser (roof)')); spawnLeak(run, run.len - 0.3, 'burst', { kind: 'overflow', rate: 40, room: 'Roof tank (overflow)' }); }
    S.pumpFlow = S.pumpOn ? 45 : 0;
    const fillable = S.tankCap - S.tank; S.tank = clamp(S.tank + S.pumpFlow * dt / 60 - 0, 0, S.tankCap);
    S.sump = clamp(S.sump - S.pumpFlow * dt / 60 - leakLift * dt / 60 * 0, 0, S.sumpCap);
    const mainsIn = V['V-MAIN'].open && S.mainsOn && S.sump < S.sumpCap ? Math.min(60, S.pumpFlow + 0.5 * (S.sumpCap - S.sump) / 100 + 0) : 0;
    S.sump = clamp(S.sump + mainsIn * dt / 60, 0, S.sumpCap);
    S.mainsFlow = V['V-MAIN'].open && S.mainsOn ? mainsIn + S.poolFlow + S.irrFlow + leakExt + leakMain : 0;
    if (S.sump <= 20 && S.pumpOn) { S.pumpOn = false; S.pumpFlow = 0; if (!S.pumpLock) { S.pumpLock = true; log('Pump dry-run protection: sump empty, pump stopped', 'w'); } } if (S.sump > 200) S.pumpLock = false;
    S.consumedToday += (S.distTotal + S.poolFlow + S.irrFlow) * dt / 60;
    // pressure
    const target = !V['V-TANK'].open ? 0.25 : S.tank < 1 ? 0 : clamp(3.6 - 0.03 * S.distTotal, 0.5, 3.6);
    S.pressure += (target - S.pressure) * Math.min(1, dt * 0.6 / Math.max(1, S.scale * 0.3));
    // run flows for visuals
    RUNS.forEach(r => { let f = r.flow ? r.flow() : 0; if (r.leak && r.leak.rate > 0 && !r.fix) f = Math.max(f, r.leak.rate); r.activeFlow = zoneSupplied(r) || r.zone === 'DRAIN' ? f : 0; if (r.fix && r.activeFlow === 0 && r.fix.flow) r.activeFlow = r.fix.flow; });
    // leak geometry
    S.leaks.forEach(L => {
        const rad = Math.min(3.8, Math.sqrt(L.vol * 1000 / (Math.PI * 0.3)) / 100);
        L.puddle.scale.setScalar(Math.max(0.01, rad)); L.radius = rad;
        if (L.vol > 120 && L.floor !== 'SITE' && L.floor !== 'ROOF' && L.floor !== 'BSMT') { const below = ORDER[ORDER.indexOf(L.floor) - 1]; L.stain.visible = true; L.stain.position.set(L.pos.x, LEVEL[L.floor] - 0.04, L.pos.z); L.stain.scale.setScalar(Math.min(2.4, rad * 0.6)); L.below = below; }
        else if (L.vol > 120 && L.floor === 'ROOF') { L.stain.visible = true; L.stain.position.set(L.pos.x, LEVEL.ROOF - 0.04, L.pos.z); L.stain.scale.setScalar(Math.min(2.4, rad * 0.6)); }
    });
}

/* ------------------------------------------------------------ detection + protection (Loxone Miniserver logic) */
function log(msg, cls = '') { const l = $('log'); if (!l) return; const d = document.createElement('div'); d.innerHTML = `<span class="t">${clockStr()}</span><span class="${cls}">${msg}</span>`; l.prepend(d); while (l.children.length > 200) l.lastChild.remove(); }
let audioCtx = null;
function beep(freqs, type = 'sawtooth', vol = 0.05) { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const t0 = audioCtx.currentTime; freqs.forEach(([f, s, d]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t0 + s); g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d); o.connect(g); g.connect(audioCtx.destination); o.start(t0 + s); o.stop(t0 + s + d + 0.02); }); } catch (e) { /* audio blocked */ } }
let sirenIv = null;
function notify(a) {
    const c = S.cfg; if (c.notify) { log(`Notification sent: push to owner app, SMS to caretaker, e-mail to plumber: "${a.text}"`, 'a'); }
    if (c.siren) { clearInterval(sirenIv); let n = 0; sirenIv = setInterval(() => { beep([[n % 2 ? 660 : 960, 0, 0.3]]); if (++n > 8) clearInterval(sirenIv); }, 400); }
    if (c.lights) log('Loxone lighting: lights in the affected area flash red; Audioserver announces "Water leak detected"', 'a');
}
function raise(kind, text, o = {}) {
    if (S.alarms.some(a => !a.cleared && a.key === o.key)) return;
    const a = Object.assign({ id: S.alarms.length + 1, kind, text, t: S.t, cleared: false, key: o.key || kind + text }, o); S.alarms.push(a); S.ack = false;
    log('ALARM · ' + text, 'a'); notify(a);
    S.leaks.forEach(L => { if (!L.detected && (a.leak === L || (!a.leak && a.floor && L.floor === a.floor))) L.detected = S.t; });
    if (S.cfg.auto) protect(a); refreshUI(); updateBanner();
}
const closeValve = (id, why) => { const v = VALVES[id]; if (!v || !v.open) return; v.open = false; setValveVisual(v); log(`${v.name} CLOSED (${why})`, 'a'); };
const openValve = (id, why) => { const v = VALVES[id]; if (!v || v.open) return; v.open = true; setValveVisual(v); log(`${v.name} opened (${why})`, 'g'); };
function setValveVisual(v) { v.act.material.color.setHex(v.open ? 0x22c55e : 0xf43f5e); v.act.rotation.z = v.open ? 0 : Math.PI / 2; v.g.children[0].material.color.setHex(v.open ? 0x1f2937 : 0x7f1d1d); }
function stopPump(why) { if (S.pumpEnabled) { S.pumpEnabled = false; log('Booster pump STOPPED (' + why + ')', 'a'); } }
function protect(a) {
    const delay = S.cfg.delay * 1000 / Math.max(1, S.scale) / 1; // visible reaction delay in real ms
    setTimeout(() => {
        if (a.act && a.act.length) {
            if (S.cfg.strategy === 'main') { closeValve('V-MAIN', 'full shut-off after ' + a.kind + ' alarm'); stopPump('leak protection'); }
            else a.act.forEach(id => id === 'PUMP' ? stopPump('leak in pump / roof area') : closeValve(id, 'zone isolation after ' + a.kind + ' alarm'));
            checkStillFlowing(a);
        } else startSweep(a);
        refreshUI();
    }, Math.max(300, delay));
}
function checkStillFlowing(a) { setTimeout(() => { if (S.distTotal > S.cfg.burst * 0.5 || S.leaks.some(L => L.rate > 1 && !L.run.zone.startsWith('DRAIN'))) { const t = S.leaks.filter(L => L.rate > 1); if (t.length) { log('Flow still above normal after zone isolation: escalating to full shut-off', 'a'); closeValve('V-TANK', 'escalation'); stopPump('escalation'); if (t.some(L => ['MAIN', 'EXT'].includes(L.run.zone))) closeValve('V-MAIN', 'escalation'); } } refreshUI(); }, 2500); }

/* valve sweep: closes each branch in turn and watches the flow meter, to locate which branch the leak is on */
function startSweep(a) {
    if (S.sweep) return; const ids = ['V-BSMT', 'V-GF', 'V-F1', 'V-F2', 'V-HOT', 'V-EXT'].filter(id => VALVES[id].open);
    S.sweep = { ids, i: -1, wait: 0, base: S.distTotal + S.poolFlow + S.irrFlow, a, was: null, found: null };
    log(`Valve sweep started: closing each branch in turn to see where the extra flow comes from (baseline ${S.sweep.base.toFixed(1)} L/min)`, 'w'); sweepStep();
}
function totalFlow() { return S.distTotal + S.poolFlow + S.irrFlow + S.leaks.filter(L => ['MAIN', 'LIFT'].includes(L.run.zone)).reduce((s, L) => s + L.rate, 0); }
function sweepStep() {
    const sw = S.sweep; if (!sw) return;
    if (sw.was) { // evaluate the branch we just closed
        const drop = sw.before - totalFlow();
        if (drop >= Math.max(1.5, sw.before * 0.4)) { sw.found = sw.was; log(`Valve sweep: flow fell by ${drop.toFixed(1)} L/min when ${VALVES[sw.was].name} closed: leak is in that zone, valve stays CLOSED`, 'a'); S.sweep = null; sw.a.zoneFound = sw.was; if (sw.was === 'V-EXT') closeValve('V-EXT', 'sweep'); updateBanner(); refreshUI(); return; }
        openValve(sw.was, 'sweep: not this branch');
    }
    sw.i++; if (sw.i >= sw.ids.length) { log('Valve sweep: no single branch accounts for the flow, so the leak is in a common section. Closing tank outlet valve and stopping the pump', 'a'); closeValve('V-TANK', 'sweep escalation'); stopPump('sweep escalation'); if (totalFlow() > 1) closeValve('V-MAIN', 'sweep escalation'); S.sweep = null; refreshUI(); return; }
    sw.was = sw.ids[sw.i]; sw.before = totalFlow(); closeValve(sw.was, 'valve sweep'); sw.wait = 2; refreshUI();
}
function sweepTick(dt) { const sw = S.sweep; if (!sw) return; sw.wait -= dt; if (sw.wait <= 0) sweepStep(); }

/* rules */
let hist = [];
function detect(dt) {
    const c = S.cfg;
    // sensors
    S.leaks.forEach(L => {
        if (L.vol <= 0 || L.repaired) return;
        SENS.forEach(s => {
            if (s.state === 'offline' || s.state === 'wet' || s.floor !== L.floor) return;
            const hit = s.special === 'float' ? (L.kind === 'overflow' && L.vol > 0.5) : s.pos.distanceTo(V3(L.pos.x, s.pos.y, L.pos.z)) <= (L.radius || 0) && (L.rate > 0 || L.vol > 0.5);
            if (hit) {
                s.state = 'wet'; s.tripAt = S.t; s.mesh.material.color.setHex(SENSOR_STATE.wet); log(`Sensor ${s.id} (${s.room}) WET`, 'a');
                if (c.spot) raise('spot', `Leak sensor ${s.id}: water at ${s.room}, ${FL[s.floor]}`, { key: 'sensor' + s.id, zone: s.zone, floor: s.floor, act: s.act, leak: L, pos: L.pos });
            }
        });
        // sensing probe: it runs alongside the pipes, so a leak anywhere on a covered pipe wets it (spray / burst fast, drips slowly)
        if (c.cable && L.run.feed !== 'drain') CABLES.forEach(cb => {
            if (cb.alarms.some(a => a.leak === L) || S.t - L.t0 < ({ burst: 2, spray: 2, weep: 10, drip: 60 }[L.sev] || 5) || !(L.rate > 0 || L.vol > 0.2)) return;
            const n = cableNearest(cb, L.pos); if (n.d > 0.55 || (cb.broken && n.at > cb.broken.at)) return;   // not near the cable / beyond an open circuit
            const lab = label(n.at.toFixed(1) + ' m', 0.7, 0.24, 'rgba(127,29,29,.95)', '#fff'); lab.position.set(n.q.x, n.q.y + 0.5, n.q.z); leakGroup.add(lab);
            cb.alarms.push({ at: n.at, t: S.t, leak: L, lab, pipe: L.run.name }); tintCable(cb, 0xf43f5e);
            log(`${cb.ctrl}: probe wet at ${n.at.toFixed(1)} m from the controller, which is on pipe "${L.run.name}"`, 'a');
            raise('cable', `${cb.ctrl} sensing probe: leak ${n.at.toFixed(1)} m along the cable, on "${L.run.name}" (${L.room})`, { key: 'cable' + cb.id + L.id, zone: cb.id, floor: L.floor, act: cb.act, leak: L, pos: L.pos });
        });
    });
    // flow rules (meter on the distribution line)
    const D = S.distTotal + S.poolFlow + S.irrFlow, res = c.meterRes;
    if (D >= c.burst && S.cont >= 0) { S.burstT = (S.burstT || 0) + dt; if (S.burstT >= 3) raise('burst', `Flow meter: ${D.toFixed(0)} L/min exceeds the ${c.burst} L/min burst limit`, { key: 'burst', floor: null, leak: S.leaks.find(l => l.rate >= 5), pos: (S.leaks[0] || {}).pos }); } else S.burstT = 0;
    // mains meter vs the water accounted for downstream (pump + pool + irrigation): the difference is an underground / outdoor leak
    const unexplained = S.leaks.filter(L => ['MAIN', 'EXT'].includes(L.run.zone)).reduce((s, L) => s + L.rate, 0);
    if (unexplained >= Math.max(res, 2)) { S.mainsT = (S.mainsT || 0) + dt; if (S.mainsT >= 3) { const L = S.leaks.find(l => ['MAIN', 'EXT'].includes(l.run.zone) && l.rate > 0); raise('mains', `Mains meter reads ${unexplained.toFixed(1)} L/min more than the water accounted for downstream: underground / outdoor leak`, { key: 'mainsleak', leak: L, pos: L && L.pos, act: L && L.run.zone === 'EXT' ? ['V-EXT'] : ['V-MAIN'] }); } } else S.mainsT = 0;
    S.cont = D >= res ? S.cont + dt : 0;
    const lim = (isNight() || S.away ? c.nightMin : c.dayMax) * 60;
    if (S.cont >= lim) raise('flow', (isNight() || S.away ? 'Night / away flow test' : 'Continuous flow') + `: water has been flowing ${(S.cont / 60).toFixed(0)} min without a pause (${D.toFixed(2)} L/min)`, { key: 'cont', leak: S.leaks.find(l => l.rate > 0), pos: (S.leaks.find(l => l.rate > 0) || {}).pos });
    hist.push([S.t, S.pressure]); while (hist.length && S.t - hist[0][0] > 6) hist.shift();
    if (hist.length > 2 && hist[0][1] - S.pressure >= c.pDrop && D > 8) raise('pressure', `Pressure sensor: rapid drop of ${(hist[0][1] - S.pressure).toFixed(2)} bar (${S.pressure.toFixed(1)} bar now)`, { key: 'pdrop' });
    // supervision
    SENS.forEach(s => { if (s.battery < 15 && s.state === 'dry' && !s.warned) { s.warned = true; s.state = 'fault'; s.mesh.material.color.setHex(SENSOR_STATE.fault); log(`Sensor ${s.id} (${s.room}): battery low (${s.battery}%) - trouble signal`, 'w'); } });
    // alarms that cleared with no leak
}
function updateBanner() {
    const b = $('banner'), act = S.alarms.filter(a => !a.cleared);
    if (!act.length || S.ack) { b.style.display = 'none'; return; } const a = act[act.length - 1];
    $('bn-t').innerText = (a.kind === 'cable' ? 'CABLE LEAK ALARM' : a.kind === 'spot' ? 'LEAK SENSOR WET' : 'WATER LEAK ALARM'); $('bn-s').innerText = a.text + (act.length > 1 ? ` (+${act.length - 1} more)` : ''); b.style.display = 'block';
}

/* ------------------------------------------------------------ view control */
let selFloor = 'ROOF';
function floorVisible(k) { if (k === 'SITE' || k === 'CORE') return true; const i = ORDER.indexOf(k), s = ORDER.indexOf(selFloor); return $('only') && $('only').checked && selFloor !== 'ROOF' ? i === s : i <= s; }
function isLayerOn(r) { return $('L-' + (r.feed === 'ext' ? 'ext' : r.feed)).checked; }
function applyView() {
    ORDER.concat(['SITE', 'CORE']).forEach(k => { if (GR[k]) GR[k].visible = floorVisible(k); });
    const rope = $('L-rope').checked;
    Object.entries(IM).forEach(([sys, list]) => list.forEach(m => { m.visible = $('L-' + sys).checked && floorVisible(m.userData.fk); if (m.material.transparent !== rope) { m.material.transparent = rope; m.material.needsUpdate = true; } m.material.opacity = rope ? 0.18 : 1; }));
    CABLES.forEach(c => { c.group.visible = $('L-cable').checked; }); SENS.forEach(s => { s.mesh.visible = $('L-sensor').checked; }); DEV.forEach(d => { d.visible = $('L-dev').checked; }); roomLabelObjs.forEach(l => { l.visible = $('L-label').checked; });
    const xv = +$('xray').value / 100; shellMats.forEach(([m, k]) => { m.opacity = (m.isLineBasicMaterial ? 0.15 + xv * 0.7 : xv * k * 0.8); }); $('xv').innerText = Math.round(xv * 100) + '%';
    document.querySelectorAll('#floorbtns button').forEach(b => b.classList.toggle('on', b.dataset.f === selFloor));
}
let camAnim = null;
function flyTo(px, py, pz, tx, ty, tz) { camAnim = { sp: camera.position.clone(), ep: V3(px, py, pz), st: controls.target.clone(), et: V3(tx, ty, tz), t: 0 }; }
const CAMS = { front: [-20, 8, 36, 2, 3, 4], aerial: [-26, 24, 34, 2, 2, 2], plant: [20, 4, 14, 11, -1, -6], roof: [9, 15, 4, 1.2, 11, -5], riser: [RISER_X(), 6, 0, RISER_X(), 4, 0], pool: [-14, 5, 20, -8, 0, 10] };
function RISER_X() { return 0; }
function setCam(k) { const c = CAMS[k]; if (k === 'riser') { flyTo(RISER.x + 7, 7, RISER.z + 9, RISER.x + 0.5, 4, RISER.z); return; } if (c) flyTo(...c); }
function showLeak() { const L = S.leaks[S.leaks.length - 1]; if (!L) return; if (L.floor !== 'SITE' && ORDER.indexOf(selFloor) < ORDER.indexOf(L.floor)) { selFloor = L.floor; } else if ($('only').checked) selFloor = L.floor === 'SITE' ? selFloor : L.floor; applyView(); flyTo(L.pos.x + 6, L.gy + 5.5, L.pos.z + 9, L.pos.x, L.gy + 0.4, L.pos.z); }
let capT = 0;
function caption(title, text, bad) { const c = $('caption'); c.className = 'panel' + (bad ? ' bad' : ''); c.innerHTML = `<b>${title}</b><div style="margin-top:3px;color:#cbd5e1;line-height:1.45">${text}</div>`; c.style.display = 'block'; clearTimeout(capT); capT = setTimeout(() => { c.style.display = 'none'; }, 9000); }

/* ------------------------------------------------------------ user actions */
function nearestSeg(ray) {
    let best = null, bd = 1e9; const cr = V3(), cs = V3();
    for (const s of SEGS) { if (!isLayerOn(s.run) || !floorVisible(s.run.floorKey)) continue; const d2 = ray.distanceSqToSegment(s.a, s.b, cr, cs), dist = cr.distanceTo(camera.position), tol = 0.14 + 0.012 * dist; if (d2 < tol * tol && d2 < bd) { bd = d2; best = { s, p: cs.clone() }; } }
    return best;
}
function distAlong(run, seg, p) { let d = 0; for (let i = 1; i < seg.i; i++) d += run.pts[i].distanceTo(run.pts[i - 1]); return d + seg.a.distanceTo(p); }
let leakTool = false, toolSev = 'burst';
function injectAt(hit) { if (!hit) return; const r = hit.s.run, d = distAlong(r, hit.s, hit.p); if (r.leak) { caption('Already leaking', 'That pipe run already has a leak. Repair or reset it first.', true); return; } spawnLeak(r, d, toolSev); showLeak(); caption('Leak injected', `${SEV[toolSev].name} on "${r.name}". Watch the detection chain: sensor / cable / flow meter, then the valves.`, true); }
const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', e => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); raycaster.setFromCamera(mouse, camera);
    const tip = $('tip'); let txt = '';
    const sh = SENS.filter(s => s.mesh.visible && floorVisible(s.floor)).map(s => [raycaster.ray.distanceSqToPoint(s.pos), s]).sort((a, b) => a[0] - b[0])[0];
    if (sh && sh[0] < 0.12) txt = `<b>${sh[1].id}</b> ${sh[1].kind}<br>${sh[1].room} · ${FL[sh[1].floor]}<br>State: <b>${sh[1].state.toUpperCase()}</b> · battery ${sh[1].battery}%`;
    else { const h = nearestSeg(raycaster.ray); if (h) { const r = h.s.run; txt = `<b>${r.name}</b><br>${{ cold: 'Cold water', hot: 'Hot water', drain: 'Drainage', ext: 'Mains / outdoor' }[r.feed]} · zone ${r.zone}<br>${r.len.toFixed(1)} m · flow ${(r.activeFlow || 0).toFixed(1)} L/min` + (leakTool ? '<br><i>click to inject a leak</i>' : ''); } }
    tip.style.display = txt ? 'block' : 'none'; if (txt) { tip.innerHTML = txt; tip.style.left = Math.min(e.clientX + 14, innerWidth - 270) + 'px'; tip.style.top = e.clientY + 14 + 'px'; }
    renderer.domElement.style.cursor = leakTool ? 'crosshair' : 'default';
});
let downAt = null; renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); raycaster.setFromCamera(mouse, camera);
    if (leakTool) { injectAt(nearestSeg(raycaster.ray)); return; }
    const sh = SENS.filter(s => s.mesh.visible && floorVisible(s.floor)).map(s => [raycaster.ray.distanceSqToPoint(s.pos), s]).sort((a, b) => a[0] - b[0])[0]; if (sh && sh[0] < 0.12) { selSensor = sh[1]; setTab('sensors'); refreshUI(); }
});

/* ---- scenarios */
const byName = n => RUNS.find(r => r.name.includes(n));
function spawnOn(name, frac, sev, opts) { const r = byName(name); if (!r) return null; if (r.leak) return r.leak; return spawnLeak(r, r.len * frac, sev, opts); }
const SCEN = [
    ['Burst pipe on the first floor', 'A cold feed bursts above the Female Suite. Big flow: flow meter + pressure + cable/sensor all trip.', () => spawnOn('First floor · Female Suite · cold feed', 0.5, 'burst')],
    ['Washing machine hose bursts', 'Utility hose in the wet kitchen sprays. The sensing probe alongside the pipe and the wireless sensor both alarm, and the GF zone valve closes.', () => spawnOn('Washing machine cold drop', 0.6, 'spray')],
    ['Slow hidden leak in a wall', 'A 3 L/h drip behind the Second-floor ensuite. Too small for the meter; found by the sensor or the night flow test.', () => spawnOn('Second floor · Ensuite · Basin cold drop', 0.5, 'drip')],
    ['Tap left running', 'A basin tap is left open. After the maximum run time the continuous-flow rule fires and a valve sweep finds the floor.', () => { const x = FIX.find(f => f.floor === 'F1' && f.type === 'Basin'); x.manual = true; x.use = 99999; log('Tap left running: ' + x.room + ' ' + x.type, 'w'); caption('Tap left running', 'No pipe is broken. The system finds it from the flow pattern (continuous flow) then a valve sweep.', false); }],
    ['Roof tank overflow (float stuck)', 'The float valve sticks while the pump keeps filling. High-level float + roof sensor stop the pump and close the main valve.', () => { S.floatStuck = true; S.tank = S.tankCap * 0.998; S.pumpEnabled = true; S.pumpOn = true; log('Roof tank float valve stuck open', 'w'); }],
    ['Pool top-up valve stuck open', 'The pool fill valve sticks open: constant 40 L/min from the mains. Flow rule + valve sweep isolate the pool / irrigation valve.', () => { const x = FIX.find(f => f.k === 'pool'); x.manual = true; x.use = 99999; }],
    ['Hot water cylinder ruptures', 'The roof hot-water cylinder splits. Tray sensor trips, hot valve closes.', () => spawnOn('Hot cylinder outlet', 0.05, 'burst', { room: 'Hot cylinder (roof)' })],
    ['Underground mains leak', 'The buried street supply cracks. Only the mains meter sees it; the main valve is the only fix.', () => spawnOn('Mains supply line', 0.7, 'spray', { room: 'Mains (underground)' })],
    ['Irrigation pipe break', 'A lawn irrigation line is dug through. Flow rule + sweep close the pool / irrigation valve.', () => spawnOn('Irrigation lawn loop', 0.5, 'spray')],
    ['Several leaks at once', 'Three leaks on three floors at the same time: tests that all are located.', () => { spawnOn('Ground floor · Kitchen · Kitchen sink cold drop', 0.5, 'weep'); spawnOn('First floor · Kids\' Suite · Shower cold drop', 0.5, 'spray'); spawnOn('Basement · Bar · Bar sink cold drop', 0.5, 'weep'); }],
    ['Sensor battery low / offline', 'A leak sensor goes offline and another reports low battery: the supervision shows a trouble signal.', () => { const a = SENS[0], b = SENS[2]; a.state = 'offline'; a.mesh.material.color.setHex(SENSOR_STATE.offline); b.battery = 9; log(`Sensor ${a.id} OFFLINE (no radio signal)`, 'w'); }]
];
function runScenario(i) { const s = SCEN[i]; caption(s[0], s[1], true); const r = s[2](); if (r && r.pos) showLeak(); refreshUI(); updateBanner(); }
function resetAll() {
    [...S.leaks].forEach(removeLeak); S.alarms.forEach(a => { a.cleared = true; }); S.alarms = []; S.sweep = null; S.floatStuck = false; S.pumpLock = false; S.cont = 0; S.burstT = 0; hist = [];
    FIX.forEach(x => { x.manual = false; x.use = 0; x.flow = 0; }); clearInterval(sirenIv);
    Object.values(VALVES).forEach(v => { v.open = true; setValveVisual(v); }); S.pumpEnabled = true; S.mainsOn = true;
    SENS.forEach(s => { s.state = 'dry'; s.warned = false; s.tripAt = null; s.battery = Math.max(s.battery, 60); s.mesh.material.color.setHex(SENSOR_STATE.dry); }); CABLES.forEach(c => { c.alarms.forEach(a => leakGroup.remove(a.lab)); c.alarms = []; c.broken = null; tintCable(c, 0xe879f9); }); RUNS.forEach(r => paintRun(r, 'base'));
    log('Reset: leaks cleared, valves reopened, sensors dried and re-armed', 'g'); S.ack = false; updateBanner(); refreshUI();
}
function ackAlarm() { S.ack = true; updateBanner(); log('Alarm acknowledged by user (siren silenced, leak still active until repaired)', 'w'); clearInterval(sirenIv); refreshUI(); }
function dryAndReopen() { SENS.forEach(s => { if (s.state === 'wet' && !S.leaks.some(L => L.floor === s.floor && L.radius > 0 && s.pos.distanceTo(V3(L.pos.x, s.pos.y, L.pos.z)) <= L.radius)) { s.state = 'dry'; s.mesh.material.color.setHex(SENSOR_STATE.dry); } }); log('Sensors re-armed. Reopen valves manually once the leak is repaired.', 'g'); refreshUI(); }
function testSensors() { log('Sensor self-test started: every sensor is polled in turn', 'w'); SENS.forEach((s, i) => setTimeout(() => { const old = s.mesh.material.color.getHex(); s.mesh.material.color.setHex(0x38bdf8); setTimeout(() => s.mesh.material.color.setHex(s.state === 'dry' ? SENSOR_STATE.dry : old), 250); if (i === SENS.length - 1) log(`Self-test done: ${SENS.filter(x => x.state === 'dry').length}/${SENS.length} OK, ${SENS.filter(x => x.state !== 'dry').length} need attention`, 'g'); }, i * 60)); }
function valveExercise() { log('Valve exercise test: each motor valve is cycled to keep it from seizing', 'w'); Object.values(VALVES).forEach((v, i) => setTimeout(() => { const was = v.open; v.open = !was; setValveVisual(v); setTimeout(() => { v.open = was; setValveVisual(v); if (i === Object.values(VALVES).length - 1) log('Valve exercise complete: all valves moved and returned', 'g'); }, 400); }, i * 500)); }

/* ------------------------------------------------------------ UI */
let selSensor = null, tab = 'dash';
const TABS = [['dash', 'Dashboard', 'gauge-high'], ['lab', 'Leak lab', 'flask'], ['sensors', 'Sensors', 'satellite-dish'], ['rules', 'Automation', 'sliders'], ['log', 'Log', 'list']];
function setTab(t) { tab = t; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); document.querySelectorAll('.tab').forEach(d => d.classList.toggle('on', d.id === 'tab-' + t)); refreshUI(); }
function buildUI() {
    $('tabs').innerHTML = TABS.map(([k, n, i]) => `<button data-t="${k}"><i class="fa-solid fa-${i}"></i> ${n}</button>`).join('');
    $('tabs').onclick = e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.t); };
    $('body').innerHTML = `
    <div class="tab" id="tab-dash">
        <div class="kpis"><div class="kpi"><span>Flow after tank</span><b id="k-dist">0</b><span>L/min</span></div><div class="kpi"><span>Mains meter</span><b id="k-main">0</b><span>L/min</span></div><div class="kpi"><span>Pressure</span><b id="k-p">0</b><span>bar</span></div>
        <div class="kpi"><span>Water lost to leaks</span><b id="k-lost">0</b><span>litres</span></div><div class="kpi"><span>Used today</span><b id="k-used">0</b><span>litres</span></div><div class="kpi"><span>Active leaks</span><b id="k-leaks">0</b><span>on pipes</span></div></div>
        <div class="card" style="margin-top:9px"><div class="row"><span>Roof tank</span><b id="k-tank"></b></div><div class="bar"><i id="b-tank"></i></div><div class="row" style="margin-top:6px"><span>Underground sump</span><b id="k-sump"></b></div><div class="bar"><i id="b-sump" style="background:#22d3ee"></i></div>
            <div class="row" style="margin-top:6px"><span>Booster pump</span><span id="k-pump"></span></div></div>
        <h4>Valves (Loxone motor valves)</h4><div id="valves"></div>
        <div class="grid2" style="margin-top:6px"><button class="btn danger" onclick="WL.closeAll()">Close ALL (shut-off)</button><button class="btn good" onclick="WL.openAll()">Open all</button></div>
        <h4>Active alarms</h4><div id="alarms" class="small dim">None</div>
        <div class="grid2" style="margin-top:6px"><button class="btn" onclick="WL.ack()">Acknowledge</button><button class="btn good" onclick="WL.resetAll()">Reset all</button></div>
    </div>
    <div class="tab" id="tab-lab">
        <div class="card"><b>Leak tool</b><div class="small dim" style="margin:4px 0">Choose a size, then click any pipe in the 3D view to make it leak at that exact point.</div>
            <div class="grid2" id="sevbtns"></div><button class="btn" id="tool" style="margin-top:6px;width:100%" onclick="WL.tool()">Leak tool: OFF (click to enable)</button></div>
        <div class="card"><b>Or pick a pipe</b><select id="runsel" style="margin-top:5px"></select><div class="row small dim"><span>Position along pipe</span><b id="rund">0 m</b></div><input type="range" id="runpos" min="0" max="100" value="50" oninput="WL.slide()"><div id="probe" class="small" style="margin-top:5px;color:#5eead4"></div>
            <button class="btn danger" style="width:100%;margin-top:6px" onclick="WL.injectSel()">Inject leak here</button></div>
        <h4>Ready-made scenarios</h4><div id="scen"></div>
        <h4>Active leaks</h4><div id="leaklist" class="small dim">None</div>
    </div>
    <div class="tab" id="tab-sensors">
        <div class="grid2"><button class="btn" onclick="WL.testSensors()">Test all sensors</button><button class="btn" onclick="WL.dry()">Re-arm dry sensors</button></div>
        <div class="card" id="selsens" style="margin-top:8px">Click a sensor in the list or in 3D.</div>
        <h4>Sensing probes laid alongside the pipes (TraceTek-style)</h4><div id="cables"></div>
        <h4>Spot leak sensors</h4><div id="senslist"></div>
    </div>
    <div class="tab" id="tab-rules">
        <div class="card"><b>Simulation</b><div class="row"><span>Household activity (random taps)</span><input type="checkbox" id="c-act" checked></div>
            <div class="row"><span>Away mode (nobody home)</span><input type="checkbox" id="c-away"></div><div class="row"><span>Mains supply available</span><input type="checkbox" id="c-mains" checked></div>
            <div class="row"><span>Set time of day</span><input type="range" id="c-time" min="0" max="1439" style="width:55%"></div></div>
        <div class="card"><b>Protection</b><div class="row"><span>Automatic isolation</span><input type="checkbox" id="c-auto" checked></div>
            <div class="row"><span>Strategy</span><select id="c-strat" style="width:60%"><option value="zone">Zone first (isolate only the leaking zone)</option><option value="main">Whole house (close main valve)</option></select></div>
            <div class="row"><span>Reaction delay (s)</span><input type="number" id="c-delay" value="3" min="0" max="30" style="width:60px"></div>
            <div class="row"><span>Notify (push / SMS / e-mail)</span><input type="checkbox" id="c-notify" checked></div><div class="row"><span>Siren + audio announcement</span><input type="checkbox" id="c-siren" checked></div><div class="row"><span>Flash lights red</span><input type="checkbox" id="c-lights" checked></div></div>
        <div class="card"><b>Detection</b><div class="row"><span>Spot sensors</span><input type="checkbox" id="c-spot" checked></div><div class="row"><span>Sensing cables</span><input type="checkbox" id="c-cable" checked></div>
            <div class="row"><span>Burst limit (L/min)</span><input type="number" id="c-burst" value="20" style="width:60px"></div><div class="row"><span>Max continuous flow, day (min)</span><input type="number" id="c-daymax" value="60" style="width:60px"></div>
            <div class="row"><span>Night / away no-flow test (min)</span><input type="number" id="c-night" value="15" style="width:60px"></div>
            <div class="row"><span>Night window (from, to hour)</span><span><input type="number" id="c-nf" value="23" style="width:46px"> <input type="number" id="c-nt" value="5" style="width:46px"></span></div>
            <div class="row"><span>Flow meter</span><select id="c-res" style="width:55%"><option value="0.5">Standard (0.5 L/min)</option><option value="0.03">Ultrasonic (0.03 L/min)</option></select></div>
            <div class="row"><span>Rapid pressure drop (bar)</span><input type="number" id="c-pd" value="0.5" step="0.1" style="width:60px"></div></div>
        <div class="card"><b>Maintenance</b><div class="grid2" style="margin-top:6px"><button class="btn" onclick="WL.exercise()">Valve exercise test</button><button class="btn" onclick="WL.sweepNow()">Run valve sweep now</button></div></div>
    </div>
    <div class="tab" id="tab-log"><div id="log"></div></div>`;
    $('floorbtns').innerHTML = ['BSMT', 'GF', 'F1', 'F2', 'ROOF'].map(f => `<button class="btn" data-f="${f}">${f === 'ROOF' ? 'All' : f}</button>`).join('');
    $('floorbtns').onclick = e => { const b = e.target.closest('button'); if (b) { selFloor = b.dataset.f; applyView(); } };
    $('speed').innerHTML = [1, 10, 60, 300, 900].map(s => `<button class="btn ${s === 1 ? 'on' : ''}" data-s="${s}" style="padding:4px 0">${s}×</button>`).join('');
    $('speed').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.scale = +b.dataset.s; document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', x === b)); };
    ['only', 'xray', 'L-rope', 'L-cold', 'L-hot', 'L-drain', 'L-ext', 'L-cable', 'L-sensor', 'L-dev', 'L-label'].forEach(id => $(id).addEventListener('input', applyView));
    const syncRope = () => { const on = $('L-cable').checked, b = $('ropebtn'); b.classList.toggle('on', on); b.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Rope: ' + (on ? 'ON' : 'OFF'); };
    const toggleRope = () => { $('L-cable').checked = !$('L-cable').checked; applyView(); syncRope(); };
    $('ropebtn').onclick = toggleRope; $('L-cable').addEventListener('input', syncRope);
    window.addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && !/INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) toggleRope(); });
    document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => setCam(b.dataset.cam));
    $('sevbtns').innerHTML = Object.entries(SEV).map(([k, v]) => `<button class="btn ${k === toolSev ? 'on' : ''}" data-sev="${k}">${v.name}</button>`).join('');
    $('sevbtns').onclick = e => { const b = e.target.closest('button'); if (!b) return; toolSev = b.dataset.sev; document.querySelectorAll('#sevbtns button').forEach(x => x.classList.toggle('on', x === b)); };
    $('scen').innerHTML = SCEN.map((s, i) => `<div class="card" style="padding:7px"><b>${s[0]}</b><div class="small dim" style="margin:2px 0 5px">${s[1]}</div><button class="btn danger" onclick="WL.scen(${i})" style="width:100%">Run scenario</button></div>`).join('');
    $('runsel').innerHTML = RUNS.filter(r => r.feed !== 'drain' || r.zone === 'DRAIN').map(r => `<option value="${r.id}">${r.name} · ${r.len.toFixed(0)} m</option>`).join(''); $('runsel').onchange = WL.slide;
    const bind = (id, fn, evt = 'change') => $(id).addEventListener(evt, e => fn(e.target.type === 'checkbox' ? e.target.checked : e.target.value));
    bind('c-act', v => S.activity = v); bind('c-away', v => { S.away = v; if (v) { FIX.forEach(x => { if (!x.manual) x.use = 0; }); log('Away mode ON: any water flow is now suspicious', 'w'); } }); bind('c-mains', v => { S.mainsOn = v; log('Mains supply ' + (v ? 'restored' : 'cut'), 'w'); });
    bind('c-time', v => { S.t = (+v) * 60; }, 'input'); bind('c-auto', v => S.cfg.auto = v); bind('c-strat', v => S.cfg.strategy = v); bind('c-delay', v => S.cfg.delay = +v); bind('c-notify', v => S.cfg.notify = v); bind('c-siren', v => S.cfg.siren = v); bind('c-lights', v => S.cfg.lights = v);
    bind('c-spot', v => S.cfg.spot = v); bind('c-cable', v => S.cfg.cable = v); bind('c-burst', v => S.cfg.burst = +v); bind('c-daymax', v => S.cfg.dayMax = +v); bind('c-night', v => S.cfg.nightMin = +v); bind('c-nf', v => S.cfg.nightFrom = +v); bind('c-nt', v => S.cfg.nightTo = +v); bind('c-res', v => S.cfg.meterRes = +v); bind('c-pd', v => S.cfg.pDrop = +v);
    $('caption').onclick = () => { $('caption').style.display = 'none'; };
    $('valves').onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = VALVES[b.dataset.v]; if (v) { v.open ? closeValve(v.id, 'manual') : openValve(v.id, 'manual'); refreshUI(); } if (b.dataset.pump) { S.pumpEnabled = !S.pumpEnabled; log('Booster pump ' + (S.pumpEnabled ? 'enabled' : 'stopped') + ' (manual)', 'w'); refreshUI(); } };
    $('leaklist').onclick = e => { const b = e.target.closest('button'); if (!b) return; const L = S.leaks.find(l => l.id === +b.dataset.id); if (!L) return; if (b.dataset.a === 'fix') repairLeak(L); else { S.leaks = S.leaks; showLeakOf(L); } };
    $('cables').onclick = e => {
        const b = e.target.closest('button'), c = b && CABLES.find(x => x.id === b.dataset.cab); if (!c) return;
        if (c.broken) { c.broken = null; tintCable(c, c.alarms.length ? 0xf43f5e : 0xe879f9); log(`${c.ctrl}: cable break repaired, ${c.id} supervised again`, 'g'); }
        else { c.broken = { at: c.len * 0.5 }; tintCable(c, 0xfb923c); log(`${c.ctrl}: OPEN CIRCUIT on ${c.id} at ${c.broken.at.toFixed(1)} m (cable cut or disconnected). Trouble signal; leaks beyond that point cannot be seen`, 'w'); }
        refreshUI();
    };
    $('senslist').onclick = e => { const r = e.target.closest('.sensor'); if (r) { selSensor = SENS.find(s => s.id === r.dataset.id); const s = selSensor; if (s.floor !== 'SITE') { selFloor = s.floor === 'ROOF' ? 'ROOF' : s.floor; applyView(); } flyTo(s.pos.x + 3, s.pos.y + 3, s.pos.z + 4, s.pos.x, s.pos.y, s.pos.z); refreshUI(); } };
    $('selsens').onclick = e => { const b = e.target.closest('button'); if (!b || !selSensor) return; const s = selSensor; if (b.dataset.a === 'batt') { s.battery = 8; s.warned = false; } if (b.dataset.a === 'off') { s.state = 'offline'; s.mesh.material.color.setHex(SENSOR_STATE.offline); log(`Sensor ${s.id} set OFFLINE`, 'w'); } if (b.dataset.a === 'ok') { s.state = 'dry'; s.battery = 90; s.warned = false; s.mesh.material.color.setHex(SENSOR_STATE.dry); log(`Sensor ${s.id} restored`, 'g'); } if (b.dataset.a === 'wet') { s.state = 'wet'; s.mesh.material.color.setHex(SENSOR_STATE.wet); if (S.cfg.spot) raise('spot', `Leak sensor ${s.id}: water at ${s.room}, ${FL[s.floor]} (manual test)`, { key: 'sensor' + s.id, zone: s.zone, floor: s.floor, act: s.act, pos: s.pos }); } refreshUI(); };
    setTab('dash');
}
function showLeakOf(L) { selFloor = L.floor === 'SITE' ? selFloor : L.floor; applyView(); flyTo(L.pos.x + 6, L.gy + 5.5, L.pos.z + 9, L.pos.x, L.gy + 0.4, L.pos.z); }
const pill = (t, c) => `<span class="pill ${c}">${t}</span>`;
let uiT = 0;
function refreshUI() {
    if (!$('k-dist')) return;
    const D = S.distTotal + S.poolFlow + S.irrFlow;
    $('k-dist').innerText = D.toFixed(1); $('k-main').innerText = S.mainsFlow.toFixed(1); $('k-p').innerText = S.pressure.toFixed(2); $('k-lost').innerText = S.lost.toFixed(0); $('k-used').innerText = S.consumedToday.toFixed(0); $('k-leaks').innerText = S.leaks.length;
    $('k-tank').innerText = `${Math.round(S.tank)} L (${Math.round(S.tank / S.tankCap * 100)}%)`; $('b-tank').style.width = S.tank / S.tankCap * 100 + '%'; $('k-sump').innerText = `${Math.round(S.sump)} L`; $('b-sump').style.width = S.sump / S.sumpCap * 100 + '%';
    $('k-pump').innerHTML = S.pumpLock ? pill('DRY-RUN LOCKOUT', 'bad') : S.pumpOn ? pill('RUNNING 45 L/min', 'ok') : S.pumpEnabled ? pill('standby', 'off') : pill('STOPPED (protection)', 'warn');
    $('valves').innerHTML = Object.values(VALVES).map(v => `<div class="valve"><span>${v.name}</span><span>${pill(v.open ? 'OPEN' : 'CLOSED', v.open ? 'ok' : 'bad')} <button class="btn" style="padding:2px 8px" data-v="${v.id}">${v.open ? 'Close' : 'Open'}</button></span></div>`).join('') +
        `<div class="valve"><span>Booster pump (enable)</span><button class="btn" style="padding:2px 8px" data-pump="1">${S.pumpEnabled ? 'Stop' : 'Enable'}</button></div>`;
    const act = S.alarms.filter(a => !a.cleared); $('alarms').innerHTML = act.length ? act.map(a => `<div class="card bad" style="padding:6px;margin-bottom:5px">${a.text}<div class="small dim">${new Date(a.t * 1000 % 86400000).toISOString().substr(11, 8)} · ${a.kind}${a.zoneFound ? ' · zone ' + a.zoneFound : ''}</div></div>`).join('') : '<span class="ok">None: all clear</span>';
    if (S.sweep) $('alarms').innerHTML += `<div class="card warn" style="padding:6px">Valve sweep running: testing ${VALVES[S.sweep.was] ? VALVES[S.sweep.was].name : ''}</div>`;
    $('leaklist').innerHTML = S.leaks.length ? S.leaks.map(L => `<div class="card" style="padding:7px"><b>L${L.id}</b> · ${SEV[L.sev].name}<br>${L.run.name}<br><span class="dim">${L.room} · ${L.rate.toFixed(2)} L/min · ${L.vol.toFixed(1)} L lost · puddle ${(L.radius || 0).toFixed(1)} m</span><br>` +
        `<span class="small">${L.detected ? pill('detected after ' + Math.round(L.detected - L.t0) + ' s', 'ok') : pill('NOT DETECTED YET', 'bad')} ${L.rate > 0 ? pill('flowing', 'bad') : pill('flow stopped', 'ok')}</span><div class="grid2" style="margin-top:5px"><button class="btn" data-id="${L.id}" data-a="show">Show</button><button class="btn good" data-id="${L.id}" data-a="fix">Repair</button></div></div>`).join('') : 'None';
    $('senslist').innerHTML = FLOORS.concat(['SITE', 'ROOF']).map(f => { const l = SENS.filter(s => s.floor === f); return l.length ? `<div class="small dim" style="margin:6px 0 2px">${FL[f]}</div>` + l.map(s => `<div class="sensor" data-id="${s.id}"><span>${s.id} · ${s.room}</span>${pill(s.state.toUpperCase(), { dry: 'ok', wet: 'bad', fault: 'warn', offline: 'off' }[s.state])}</div>`).join('') : ''; }).join('');
    $('cables').innerHTML = CABLES.map(c => `<div class="card" style="padding:7px"><div class="row" style="margin:0"><span><b>${c.id}</b> · ${c.ctrl}<br><span class="dim small">${c.name} · ${c.len.toFixed(0)} m of cable</span></span>` +
        `<span>${c.broken ? pill('OPEN CIRCUIT @ ' + c.broken.at.toFixed(1) + ' m', 'warn') : c.alarms.length ? pill(c.alarms.length + ' LEAK' + (c.alarms.length > 1 ? 'S' : ''), 'bad') : pill('OK', 'ok')}</span></div>` +
        c.alarms.map(a => `<div class="small bad" style="margin-top:3px">@ ${a.at.toFixed(1)} m: ${a.pipe}</div>`).join('') +
        `<button class="btn" style="margin-top:5px;padding:3px 8px" data-cab="${c.id}">${c.broken ? 'Repair cable break' : 'Cable break test'}</button></div>`).join('');
    const s = selSensor; $('selsens').innerHTML = s ? `<b>${s.id}</b> · ${s.kind}<div class="dim small">${s.room} · ${FL[s.floor]} · zone ${s.zone}<br>State ${s.state.toUpperCase()} · battery ${s.battery}%<br>On alarm closes: ${s.act.join(', ')}</div><div class="grid2" style="margin-top:6px"><button class="btn" data-a="wet">Simulate wet</button><button class="btn" data-a="batt">Low battery</button><button class="btn" data-a="off">Go offline</button><button class="btn good" data-a="ok">Restore</button></div>` : 'Click a sensor in the list or in 3D.';
    const st = $('status'), wet = S.leaks.length || S.alarms.some(a => !a.cleared), tr = SENS.some(x => x.state === 'fault' || x.state === 'offline') || CABLES.some(c => c.broken);
    st.className = 'chip ' + (S.alarms.some(a => !a.cleared) ? 'bad' : S.leaks.length ? 'warn' : tr ? 'warn' : 'ok'); st.innerText = S.alarms.some(a => !a.cleared) ? 'WATER LEAK ALARM' : S.leaks.length ? 'LEAK (NOT YET DETECTED)' : tr ? 'TROUBLE: SENSOR FAULT' : 'SYSTEM NORMAL';
}
WL_API();
function WL_API() {
    window.WL = { resetAll, ack: ackAlarm, showLeak, testSensors, dry: dryAndReopen, exercise: valveExercise, scen: runScenario, S, RUNS, SENS, VALVES, NODES, danglingEnds,
        closeAll: () => { ['V-MAIN', 'V-TANK', 'V-HOT', 'V-EXT', 'V-BSMT', 'V-GF', 'V-F1', 'V-F2'].forEach(id => closeValve(id, 'manual: close all')); refreshUI(); },
        openAll: () => { Object.keys(VALVES).forEach(id => openValve(id, 'manual: open all')); S.pumpEnabled = true; refreshUI(); },
        tool: () => { leakTool = !leakTool; $('tool').innerText = 'Leak tool: ' + (leakTool ? 'ON (click a pipe)' : 'OFF (click to enable)'); $('tool').classList.toggle('on', leakTool); },
        slide: () => {
            const r = RUNS.find(x => x.id === +$('runsel').value); if (!r) return; const d = r.len * $('runpos').value / 100; $('rund').innerText = d.toFixed(1) + ' m of ' + r.len.toFixed(0) + ' m';
            const p = pointAt(r, d), hit = r.feed === 'drain' ? null : CABLES.map(c => [c, cableNearest(c, p)]).filter(([, n]) => n.d <= 0.55).sort((a, b) => a[1].d - b[1].d)[0];
            $('probe').innerHTML = hit ? `<i class="fa-solid fa-satellite-dish"></i> Probe ${hit[0].id} will read <b>${hit[1].at.toFixed(1)} m</b> from ${hit[0].ctrl}` : '<span class="dim">No sensing probe runs alongside this pipe</span>';
        },
        injectSel: () => { const r = RUNS.find(x => x.id === +$('runsel').value); if (!r) return; if (r.leak) { caption('Already leaking', 'Repair or reset that pipe first.', true); return; } spawnLeak(r, r.len * $('runpos').value / 100, toolSev); showLeak(); caption('Leak injected', `${SEV[toolSev].name} on "${r.name}".`, true); },
        sweepNow: () => { if (S.sweep) return; startSweep({ kind: 'manual', text: 'manual sweep' }); } };
}

/* ------------------------------------------------------------ main loop */
const clock = new THREE.Clock(); let acc = 0, sweepAcc = 0;
function animate() {
    requestAnimationFrame(animate);
    const real = Math.min(clock.getDelta(), 0.1), t = performance.now() / 1000; const dt = real * S.scale;
    S.t += dt; if (S.t >= 86400 * (S.day + 1)) { S.day++; S.consumedToday = 0; }
    // sub-step so fast time scales stay stable
    let rem = dt; const step = 5; while (rem > 0) { const d = Math.min(step, rem); physics(d); detect(d); sweepTick(d); rem -= d; }
    // leak visuals
    S.leaks.forEach(L => {
        const k = (t * 1.1) % 1; L.ring.scale.setScalar(1 + k * 3); L.ring.material.opacity = 1 - k; L.beam.material.opacity = 0.18 + 0.12 * Math.sin(t * 7); L.lab.visible = $('L-label').checked || true;
        const fl = L.rate > 0, sp = L.spray, arr = sp.arr, big = L.sev === 'burst' || L.sev === 'spray'; sp.pts.visible = fl;
        if (fl) for (let i = 0; i < 60; i++) { const v = sp.vel[i], age = ((t * (big ? 1.4 : 0.6) + v[3]) % 1), s = big ? 1 : 0.15; arr[i * 3] = L.pos.x + v[0] * age * s; arr[i * 3 + 1] = Math.max(L.gy + 0.03, L.pos.y + v[1] * age * s - 4.9 * age * age * (big ? 1.2 : 0.5)); arr[i * 3 + 2] = L.pos.z + v[2] * age * s; }
        sp.pts.geometry.attributes.position.needsUpdate = true;
        const vis = floorVisible(L.floor === 'SITE' ? 'SITE' : L.floor); [L.puddle, L.ring, L.beam, L.lab, sp.pts].forEach(o => { o.visible = vis && (o === sp.pts ? fl : true); }); if (L.stain.visible) L.stain.visible = vis;
    });
    // devices
    tankWater.scale.y = Math.max(0.02, S.tank / S.tankCap); tankWater.position.y = TANK.y - TANK.h / 2 * (1 - tankWater.scale.y) + 0; sumpWater.scale.y = Math.max(0.02, S.sump / S.sumpCap);
    pumpLed.material.color.setHex(S.pumpLock ? 0xf43f5e : S.pumpOn ? 0x22c55e : S.pumpEnabled ? 0x64748b : 0xfbbf24); pumpMesh.rotation.x += S.pumpOn ? real * 10 : 0;
    updateBeads(t);
    if (camAnim) { camAnim.t = Math.min(1, camAnim.t + real * 1.1); const e = camAnim.t < 0.5 ? 2 * camAnim.t * camAnim.t : 1 - Math.pow(-2 * camAnim.t + 2, 2) / 2; camera.position.lerpVectors(camAnim.sp, camAnim.ep, e); controls.target.lerpVectors(camAnim.st, camAnim.et, e); if (camAnim.t >= 1) camAnim = null; }
    controls.update();
    acc += real; if (acc > 0.35) { acc = 0; $('clock').innerText = clockStr(); $('daynight').innerText = isNight() ? '(night window)' : S.away ? '(away)' : ''; refreshUI(); if (tab !== 'dash' || true) updateBanner(); }
    renderer.render(scene, camera);
}

/* ------------------------------------------------------------ init */
buildShell(); buildNetwork(); buildPipeMeshes(); buildDevices(); buildTerminals(); buildSensors(); buildCables(); buildBeads();
Object.values(VALVES).forEach(setValveVisual); RUNS.forEach(r => { r.activeFlow = 0; });
buildUI(); applyView(); WL.slide(); setCam('front'); camAnim = null; camera.position.set(-24, 17, 38);
log('Simulation ready. Use the Leak lab to inject a leak and watch detection, isolation and notification.', 'g');
animate();
})();
