/* =====================================================================
   PACKAGE TIERS  (Basic / Moderate / Premium, from Loxone_Smart_Home_Packages_Ghana.docx)
   The full simulation is the Premium package. Basic and Moderate are Premium minus the items the
   package document does not include. Switching never rebuilds anything: it only flips .visible on
   objects that already exist and hides / shows UI blocks, so it is instant and the frame rate is
   unchanged (lights are pinned by pinLights(), so the live light count never changes and no shader
   is recompiled). Loaded last; shares the globals of the main script.
   Entry points: tierSet('basic' | 'moderate' | 'premium'), TIER.cur.
===================================================================== */
const TIER_ALL = ['audio', 'rgbw', 'shading', 'access', 'climate', 'hcl', 'vrf', 'secpro', 'solar', 'water', 'weather', 'pool', 'landscape', 'cctv', 'cinema', 'leak', 'panels'];
const TIER_DEF = {
    basic: {
        name: 'Basic', title: 'The Intelligent Core', icon: 'fa-house-signal', col: '#38bdf8', tab: 'Core',
        target: '1-2 key zones / 2-3 bedroom home',
        feats: [],
        caps: { tpf: 2, presence: 3 },
        has: ['Miniserver (local, no subscription) with app control', 'Motion / presence lighting, scenes and master All-Off', 'Presence alarm + door / window contacts', 'Generator / incomer relay and standby killer', 'Temperature sensing, 1 split AC (on/off, schedule)', '1-2 Touch switches, 2-3 presence sensors'],
        upgrade: ['Multi-room audio', 'RGBW dimming', 'Motorised blinds', 'NFC / video intercom', 'Zoned climate']
    },
    moderate: {
        name: 'Moderate', title: 'Comfort & Living Automation', icon: 'fa-couch', col: '#fbbf24', tab: 'Comfort',
        target: '3-4 bedroom bungalow / house',
        feats: ['audio', 'rgbw', 'shading', 'access', 'climate'],
        caps: { tpf: 7 },
        has: ['Everything in Basic', 'RGBW 24 V dimming and ambient light', 'Zoned climate with window-open interlock', 'Audioserver: multi-room audio, doorbell and siren output', 'Motorised blinds with solar-protection logic', 'NFC Code Touch / video intercom, gate control', 'Load-shedding logic, 6-8 presence sensors, 5-7 Touch switches'],
        upgrade: ['DALI / HCL lighting', 'VRF + air quality', 'Solar / battery microgrid', 'Biometrics, beams, garage', 'Water, irrigation, pergola', 'CCTV, leak detection']
    },
    premium: {
        name: 'Premium', title: 'The Intelligent Estate', icon: 'fa-crown', col: '#f59e0b', tab: 'Estate',
        target: 'Luxury estate / villa',
        feats: TIER_ALL.slice(),
        caps: {},
        has: ['Everything in Moderate', 'DALI / DMX + Human Centric Lighting', 'VRF / VRV protocol control, CO2 / VOC air quality', 'Solar + battery microgrid, EV wallbox, SoC load shedding', 'Video intercom, biometrics, glass-break, beams, garage', 'Water tanks, pump priming, leak detection', 'Wind / rain pergola, rain-aware irrigation, pool and landscape lighting'],
        upgrade: []
    }
};
// device type -> feature that supplies it (types not listed are in every package)
const TIER_TYPE_FEAT = { speaker: 'audio', rgbw: 'rgbw', dimmer: 'rgbw', unknown: 'panels', display: 'panels', tablet: 'panels', evcharger: 'solar', inverter: 'solar' };
const TIER_FLOOR_PRIO = ['GF', 'F1', 'F2', 'BSMT'];

const TIER = { cur: null, feats: new Set(), saved: {}, xpAll: null, ready: false };
const tq = (sel, root) => (root || document).querySelector(sel);
const tqa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const tshow = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };
const tsafe = fn => { try { return fn(); } catch (e) { console.warn('[tiers]', e && e.message ? e.message : e); } };
const tHas = f => TIER.feats.has(f);

/* ---------- devices ---------- */
function tierDevices() {
    const def = TIER_DEF[TIER.cur];
    devices.forEach(d => {
        const f = TIER_TYPE_FEAT[d.type];
        d.tierOff = !!f && !tHas(f);
    });
    Object.entries(def.caps).forEach(([type, n]) => {   // keep the first n of a type, ground floor first
        const list = devices.filter(d => d.type === type && !d.tierOff).sort((a, b) => TIER_FLOOR_PRIO.indexOf(a.floor) - TIER_FLOOR_PRIO.indexOf(b.floor));
        list.slice(n).forEach(d => { d.tierOff = true; });
    });
    devices.forEach(d => { d.root.visible = !d.tierOff && visibleTypes[d.type]; });
    refreshMarkers();
    const live = devices.filter(d => !d.tierOff);
    const set = (id, v) => { const e = px$(id); if (e) e.innerText = v; };
    set('device-total', live.length);
    set('speaker-count', live.filter(d => d.type === 'speaker').length);
    set('smoke-count', live.filter(d => d.type === 'smoke').length);
    buildLegend();
}

/* ---------- 3D objects that belong to one feature ---------- */
function tierHandles() {
    const T = (typeof PX !== 'undefined' && PX.t3d) || {}, L = typeof LK !== 'undefined' ? LK : {};
    return {
        shading: () => blinds,
        cctv: () => cctvCameras.map(c => c.mesh),
        solar: () => [ROOFM.pvG, SHED.invGroup, ...(SHED.batGroups || []), EVCH.grp, EVCH.fallback, EVCABLE.group],
        water: () => [ROOFM.tkG],
        vrf: () => [T.grpVrf],
        access: () => [T.grpIc],
        weather: () => [T.grpPergola],
        leak: () => [L.listGroup, L.valveGroup]
    };
}
function tierEnforce() {   // hides what is off (also catches models that finish loading later); never forces anything on
    const H = tierHandles();
    Object.keys(H).forEach(f => { if (!tHas(f)) tsafe(() => H[f]().forEach(o => { if (o && o.visible) o.visible = false; })); });
    if (!tHas('cctv')) tierDevicesQuick();
}
function tierDevicesQuick() { devices.forEach(d => { if (d.tierOff && d.root.visible) d.root.visible = false; }); }
function tierReveal(f) { tsafe(() => tierHandles()[f] && tierHandles()[f]().forEach(o => { if (o) o.visible = true; })); }

/* ---------- running state that has to stop when a feature goes away ---------- */
function tierQuiesce(f) {
    tsafe(() => {
        switch (f) {
            case 'audio': if (isAudioOn) toggleAudio(); break;
            case 'rgbw': setAllZoneColor('#ffd29a'); if (currentScene === 'PARTY') triggerScene('DUSK'); break;
            case 'hcl': if (PX.hcl.on) { px$('px-hcl-on').checked = false; pxHclToggle(false); } PX.hcl.play = false; break;
            case 'access': if (isGateOpen) toggleMainGate(); if (PX.sec.call) pxCallEnd(); break;
            case 'secpro': TIER.saved.beams = PX.sec.beams; PX.sec.beams = false; PX.t3d.beamGroup.visible = false; if (PX.sec.garageOpen) pxGarage(false); if (isAlarmActive) toggleHazardAlarm(); break;
            case 'solar': if (isEvCharging) toggleEvCharging(); break;
            case 'weather': PX.wx.rain = false; PX.wx.perg = 'auto'; if (isIrrigationActive) toggleIrrigation(); break;
            case 'pool': setPoolMaster(false); break;
            case 'landscape': tierExtZones(false); break;
            case 'cctv': if (currentCCTVIndex >= 0) exitCCTV(); break;
            case 'cinema': if (cinema.projector) toggleCinemaDevice('projector'); if (cinema.receiver) toggleCinemaDevice('receiver'); if (typeof cinemaStop === 'function') cinemaStop(); break;
            case 'leak': TIER.saved.leakShow = LK.show; lkReset(); lkShowCables(false); break;
        }
    });
}
function tierRestore(f) {
    tsafe(() => {
        switch (f) {
            case 'secpro': PX.sec.beams = TIER.saved.beams !== false; px$('px-beams').checked = PX.sec.beams; PX.t3d.beamGroup.visible = PX.sec.beams; break;
            case 'pool': setPoolMaster(true); break;
            case 'landscape': tierExtZones(true); break;
            case 'leak': lkShowCables(TIER.saved.leakShow !== false); break;
        }
    });
}
function tierExtZones(on) {
    const zs = Object.values(zones).filter(z => z.ext);
    zs.forEach(z => { z.on = on; z.autoUntil = 0; applyZone(z); });
    extOn = on; applyEnvironment(); syncZoneUI();
    tsafe(() => { const c = px$('ext-toggle'); if (c) c.checked = on; });
}

/* ---------- UI ---------- */
function tierTabs() {
    const showTab = (id, on) => tshow(px$('tab-btn-' + id), on);
    showTab('cinema', tHas('cinema')); showTab('leak', tHas('leak')); showTab('energy', tHas('solar'));
    const def = TIER_DEF[TIER.cur], b = px$('tab-btn-estate');
    if (b) { b.innerHTML = `<i class="fa-solid ${def.icon} text-base"></i><span>${def.tab}</span>`; }
    // if the open tab just vanished, fall back to the Estate / package tab
    const open = tqa('.tab-content').find(e => !e.classList.contains('hidden'));
    if (open) { const id = open.id.replace('tab-content-', ''), btn = px$('tab-btn-' + id); if (btn && btn.style.display === 'none') switchTab('estate'); }
}
function tierLightingTab() {
    const card = id => { const e = px$(id); return e ? e.closest('.glass-card') : null; };
    tshow(card('ext-toggle'), tHas('landscape')); tshow(card('pool-master'), tHas('pool')); tshow(card('all-zones-col'), tHas('rgbw'));
    const aud = tq('#btn-audio'); if (aud) tshow(aud.closest('.space-y-2'), tHas('audio'));
    const bl = tq('#tab-content-lighting [onclick*="setBlindsState"]'); if (bl) tshow(bl.closest('.space-y-2'), tHas('shading'));
    // per-room colour pickers / swatches are RGBW features; exterior zones only exist with landscape lighting
    tqa('#zone-list input[type=color]').forEach(e => tshow(e, tHas('rgbw')));
    tqa('#zone-list .flex.gap-1').forEach(e => tshow(e, tHas('rgbw')));
    Object.values(zones).filter(z => z.ext).forEach(z => { const e = px$(`zone-${z.id}-on`); if (e) tshow(e.closest('.glass-card'), tHas('landscape')); });
    tqa('#zone-list h5').forEach(h => { if (/exterior/i.test(h.textContent)) tshow(h, tHas('landscape')); });
}
function tierSecurityTab() {
    const cs = tq('#camera-selector'); if (cs) tshow(cs.closest('.space-y-2'), tHas('cctv'));
    const g = px$('btn-gate-toggle'), n = tq('#tab-content-security [onclick*="simulateNFCScan"]');
    if (g) tshow(g.closest('.glass-card'), tHas('access')); if (n) tshow(n.closest('.glass-card'), tHas('access'));
    if (g) tshow(g.closest('.space-y-2'), tHas('access'));
}
function tierChrome() {
    tqa('#left-panel .cam-btn').forEach(b => {
        const oc = b.getAttribute('onclick') || '';
        const feat = /'CINEMA'/.test(oc) ? 'cinema' : /'POOL'/.test(oc) ? 'pool' : /'ROOF'|'SHED'/.test(oc) ? 'solar' : /TAB_HALL|TAB_MASTER/.test(oc) ? 'panels' : null;
        if (feat) tshow(b, tHas(feat));
    });
    const sv = px$('solar-live-val'), wv = px$('water-live-val');
    if (sv) tshow(sv.closest('div'), tHas('solar')); if (wv) tshow(wv.closest('div'), tHas('water'));
    // guided tours skip the steps whose equipment is not in this package
    if (typeof XP_STEPS !== 'undefined') {
        if (!TIER.xpAll) TIER.xpAll = XP_STEPS.slice();
        const need = { 'Arrival: sliding gate': 'access', 'Front door: tap to enter': 'access', 'EV wallbox on Loxone': 'solar', 'Solar inverter & DB shed': 'solar', 'Hybrid inverter & battery': 'solar', 'Pool & deck': 'pool', 'Basement cinema': 'cinema', 'Hall control tablet': 'panels', 'Your turn: master tablet': 'panels', 'Master bed LED strip': 'rgbw' };
        if (typeof xp !== 'undefined' && xp.i >= 0) tsafe(stopExperienceTour);
        XP_STEPS.length = 0; TIER.xpAll.forEach(s => { if (!need[s.t] || tHas(need[s.t])) XP_STEPS.push(s); });
    }
}

/* Estate tab: one block per heading, so a block can be shown or hidden as a unit */
function tierWrapEstate() {
    const el = px$('tab-content-estate'); if (!el || el.dataset.tiered) return; el.dataset.tiered = '1';
    const kids = Array.from(el.children), map = [['Architectural lighting', 'hcl'], ['Microclimate', 'climate'], ['Estate security', 'security'], ['Energy independence', 'energy'], ['Water management', 'water'], ['Weather station', 'weather'], ['Loxone Audioserver', 'audio']];
    kids[0].dataset.tierIntro = '1';
    for (let i = 1; i < kids.length - 1; i++) {
        if (kids[i].tagName !== 'H4') continue;
        const m = map.find(([t]) => kids[i].textContent.includes(t)); if (!m) continue;
        const w = document.createElement('div'); w.className = 'space-y-2'; w.dataset.tierBlock = m[1];
        el.insertBefore(w, kids[i]); w.appendChild(kids[i]); w.appendChild(kids[i + 1]);
    }
    const card = el.insertBefore(document.createElement('div'), el.firstChild); card.id = 'tier-card'; card.className = 'glass-card p-3 rounded-xl space-y-2';
}
function tierEstate() {
    tierWrapEstate();
    const def = TIER_DEF[TIER.cur], el = px$('tab-content-estate'); if (!el) return;
    const intro = tq('[data-tier-intro]', el); if (intro) tshow(intro, false);
    const card = px$('tier-card');
    card.innerHTML = `<div class="flex justify-between items-center"><span class="font-bold text-slate-200 text-sm"><i class="fa-solid ${def.icon} mr-1.5" style="color:${def.col}"></i>${def.name} package &middot; ${def.title}</span></div>
        <p class="text-[10px] text-slate-400">Target: ${def.target}</p>
        <ul class="grid grid-cols-1 gap-0.5 text-[11px] text-slate-300">${def.has.map(t => `<li><span class="text-emerald-400">&#10003;</span> ${t}</li>`).join('')}</ul>
        ${def.upgrade.length ? `<div class="text-[10px] text-slate-500 border-t border-slate-700/50 pt-1.5">Not in this package: ${def.upgrade.join(' &middot; ')}</div>` : ''}
        <p class="text-[10px] text-slate-500">Package contents follow Loxone_Smart_Home_Packages_Ghana.docx. Behaviour is simulated.</p>`;
    const blk = f => tq(`[data-tier-block="${f}"]`, el);
    tshow(blk('hcl'), tHas('hcl')); tshow(blk('climate'), tHas('climate')); tshow(blk('water'), tHas('water')); tshow(blk('weather'), tHas('weather')); tshow(blk('audio'), tHas('audio'));
    tshow(blk('security'), tHas('access') || tHas('secpro')); tshow(blk('energy'), true);
    // security rows: intercom comes with Moderate, the rest is Premium
    const sec = blk('security');
    if (sec) tqa(':scope > div:last-child > *', sec).forEach(r => {
        const t = r.textContent;
        if (/Video intercom/.test(t)) tshow(r, tHas('access'));
        else if (/Biometric|Glass-break|glass break|Perimeter beams|beam break|Garage door/.test(t)) tshow(r, tHas('secpro'));
    });
    // climate: protocol profile and air-quality tests are VRF extras
    const cl = blk('climate');
    if (cl) tqa(':scope > div:last-child > *', cl).forEach(r => { if (/Protocol profile|Simulate cooking|Fresh-air boost/.test(r.textContent)) tshow(r, tHas('vrf')); });
    const eh = tq('h4', blk('energy')); if (eh) eh.innerHTML = `<i class="fa-solid fa-car-battery text-yellow-300 mr-1.5"></i>${tHas('solar') ? 'Energy independence &middot; microgrid' : tHas('access') ? 'Power management &middot; load shedding' : 'Power management &middot; generator relay'}`;
}
function tierSwitcher() {
    if (px$('tier-switch')) return;
    const hdr = tq('header'), anchor = px$('top-floors'); if (!hdr || !anchor) return;
    const w = document.createElement('div'); w.id = 'tier-switch'; w.className = 'flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700/50 gap-1';
    w.innerHTML = `<span class="text-xs font-semibold px-2 text-slate-400 uppercase tracking-wider hidden xl:inline">Package:</span>` +
        Object.entries(TIER_DEF).map(([k, d]) => `<button id="tier-btn-${k}" onclick="tierSet('${k}')" class="floor-btn" title="${d.title}"><i class="fa-solid ${d.icon} mr-1" style="color:${d.col}"></i>${d.name}</button>`).join('');
    hdr.insertBefore(w, anchor);
}
function tierButtons() {
    Object.keys(TIER_DEF).forEach(k => { const b = px$('tier-btn-' + k); if (b) b.className = k === TIER.cur ? CLS.floorOn : CLS.floor; });
}
function tierToast(msg) {
    let t = px$('tier-toast');
    if (!t) { t = document.createElement('div'); t.id = 'tier-toast'; t.className = 'fixed z-[80] left-1/2 -translate-x-1/2 top-16 glass-panel rounded-xl px-4 py-2 text-xs font-bold text-slate-100 pointer-events-none transition-opacity'; document.body.appendChild(t); }
    t.innerHTML = msg; t.style.opacity = 1; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; }, 2200);
}

/* ---------- switch ---------- */
function tierSet(key, quiet) {
    if (!TIER_DEF[key]) return;
    const def = TIER_DEF[key], next = new Set(def.feats), prev = TIER.feats;
    if (TIER.cur === key && TIER.ready) return;
    TIER.cur = key; TIER.feats = next;
    TIER_ALL.forEach(f => { if (prev.has(f) && !next.has(f)) tierQuiesce(f); });
    TIER_ALL.forEach(f => { if (!prev.has(f) && next.has(f) && TIER.ready) { tierReveal(f); tierRestore(f); } });
    tierDevices(); tierEnforce(); tierTabs(); tierLightingTab(); tierSecurityTab(); tierChrome(); tierEstate(); tierButtons();
    renderer.shadowMap.needsUpdate = true;
    try { localStorage.setItem('loxone-tier', key); } catch (e) { }
    if (!quiet) tierToast(`<i class="fa-solid ${def.icon} mr-1" style="color:${def.col}"></i>${def.name} package &middot; ${def.title}`);
}

function tiersInit() {
    if (TIER.ready) return;
    // devices outside the package never show up in the marker / visibility code
    const _rm = refreshMarkers; refreshMarkers = function () { _rm(); devices.forEach(d => { if (d.tierOff) d.marker.visible = false; }); };
    const _stv = setTypeVisible; setTypeVisible = function (t, v) { _stv(t, v); tierDevicesQuick(); };
    const _srm = simulateRandomMotion;
    simulateRandomMotion = function () {
        const ps = devices.filter(d => d.type === 'presence' && !d.tierOff), d = ps[Math.floor(Math.random() * ps.length)]; if (!d) return;
        triggerPresence(d); if (currentFloor !== 'ALL' && currentFloor !== d.floor) setFloorFilter(d.floor);
    };
    tierSwitcher();
    let start = 'premium';
    try { const q = new URLSearchParams(location.search).get('tier'); start = TIER_DEF[q] ? q : (TIER_DEF[localStorage.getItem('loxone-tier')] ? localStorage.getItem('loxone-tier') : 'premium'); } catch (e) { }
    TIER.feats = new Set(TIER_ALL);   // the scene is built as Premium
    TIER.cur = 'premium';
    tierSet(start, true);
    TIER.ready = true;
    setInterval(tierEnforce, 1500);   // catches models that finish loading after the switch
}
(function () {
    const _ol = window.onload;
    window.onload = function () { if (_ol) _ol.apply(this, arguments); tsafe(tiersInit); };
})();
