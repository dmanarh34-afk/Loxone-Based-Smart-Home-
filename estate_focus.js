/* =====================================================================
   ESTATE TAB: NO-LAG EVENTS + "SHOW ME WHAT HAPPENS" FOR EVERY COMMAND

   1. Delay fixes
      - The intruder's torch used to be a brand-new PointLight on every alarm. Adding / removing a light changes the live light
        count, and three.js then recompiles every material shader (a 0.4-0.5 s freeze). One shared torch light now exists from
        start-up (intensity 0 when idle) and is moved with the figure.
      - The materials / textures used only by events (glass shards, crack + jagged-glass overlays, intruder figure, alarm marker,
        focus ring) are drawn once, off-screen, a few seconds after load, so their first real use does not stall.
   2. Every Estate command now shows its effect: the camera flies to where it happens (inside = the right floor cut-away,
      outside = full estate), a pulsing ring + beam marks the spot, and a caption says exactly what is happening.
      Driven by event delegation on the Estate tab, so the original handlers and the cinematic tours are untouched.
===================================================================== */
(function () {
    const $ = id => document.getElementById(id);
    let grp = null, ring = null, beam = null, cap = null, capT = 0, focusT = 0, looping = false, torch = null;

    const VIEW = { front: [-9, 3.4, 23.3, 1, 5, 5], aerial: [-30, 20, 40, 0, 2, 3], living: [6, 9, 16, -0.5, 0.5, 4.5] };
    const wp = o => o.getWorldPosition(new THREE.Vector3());
    const camNear = (p, dx, dy, dz) => [p.x + dx, p.y + dy, p.z + dz, p.x, p.y, p.z];
    function roomPos(f, re) {
        const r = (ROOM_LABELS[f] || []).find(x => re.test(x[0])); if (!r) return null;
        const p = IP(f, r[2], r[3]); return new THREE.Vector3(p.x, LEVEL[f] + 1, p.z);
    }

    /* ------------------------------------------------ 1. delay fixes */
    function installTorch() {
        torch = new THREE.PointLight(0xfff2d0, 0, 7, 1.6); scene.add(torch);
        const makeFigure = pxMakeFigure;
        pxMakeFigure = function (color, withTorch) { const g = makeFigure(color, false); if (withTorch) g.userData.torch = torch; return g; };
        const fxTick = pxFxTick;
        pxFxTick = function (dt, t) {
            fxTick(dt, t);
            const F = PXFX.figure;
            if (F) torch.position.set(F.g.position.x + F.dir.x * 0.5, F.g.position.y + 1.2, F.g.position.z + F.dir.z * 0.5); else torch.intensity = 0;
        };
    }
    function warmUp() {
        const temp = [];
        const put = o => { o.traverse(c => { c.frustumCulled = false; }); o.position.y = -90; scene.add(o); temp.push(o); return o; };
        pxShardMat = pxShardMat || new THREE.MeshStandardMaterial({ color: 0xcfe8f3, transparent: true, opacity: 0.72, roughness: 0.05, metalness: 0.5, side: THREE.DoubleSide });
        put(pxMakeFigure(0x15181d, true));
        put(new THREE.Mesh(PX_SHARD_GEOS[0], pxShardMat));
        const plane = (tex) => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
        put(plane(pxCrackTexture(2, 2, 0.5, 0.5))); put(plane(pxJagTexture(2, 2)));
        put(grp.clone());
        pxMakeMarker({ x: 0, y: -90, z: 0 }, 'WARM-UP - ignore', -90);
        PXFX.marker.g.traverse(c => { c.frustumCulled = false; });
        grp.visible = true; grp.position.y = -90;
        renderer.render(scene, camera);
        grp.visible = false; pxRemoveMarker();
        temp.forEach(o => { scene.remove(o); o.traverse(c => { if (c.geometry && c.geometry !== PX_SHARD_GEOS[0]) c.geometry.dispose(); if (c.material && c.material !== pxShardMat) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); } }); });
    }

    /* ------------------------------------------------ 2. focus marker + caption */
    function buildFocus() {
        grp = new THREE.Group(); grp.visible = false;
        ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 48), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.renderOrder = 998;
        beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 12, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        beam.position.y = 6; grp.add(ring, beam); grp.traverse(c => { c.frustumCulled = false; }); scene.add(grp);
        cap = document.createElement('div'); cap.id = 'px-caption';
        cap.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:56px;width:27rem;max-width:92vw;z-index:64;display:none;cursor:pointer;' +
            'border:1px solid rgba(34,211,238,.55);background:rgba(2,6,23,.92);backdrop-filter:blur(10px);border-radius:16px;padding:10px 14px;color:#e2e8f0;font-size:12px;box-shadow:0 20px 40px rgba(0,0,0,.5)';
        cap.title = 'Click to dismiss'; cap.onclick = () => { cap.style.display = 'none'; if (grp) grp.visible = false; };
        document.body.appendChild(cap);
    }
    function loop() {
        if (!grp.visible) { looping = false; return; }
        const k = (performance.now() / 1000 * 1.1) % 1;
        ring.scale.setScalar(1 + k * 4); ring.material.opacity = 1 - k; beam.material.opacity = 0.22 + 0.12 * Math.sin(performance.now() / 120);
        requestAnimationFrame(loop);
    }
    function show(o) {
        if (!grp) return;
        const free = !(typeof walk !== 'undefined' && walk.active);
        if (free && o.floor && currentFloor !== o.floor) setFloorFilter(o.floor, true);
        if (free && o.cam) { if (currentCCTVIndex !== -1) exitCCTV(); camAnim = null; animateCameraPosition(...o.cam); }
        const col = o.color || 0x22d3ee;
        if (o.pos) {
            grp.position.copy(o.pos); grp.position.y = o.groundY !== undefined ? o.groundY : Math.max(0, o.pos.y - 1);
            ring.material.color.setHex(col); beam.material.color.setHex(col); grp.visible = true;
            if (!looping) { looping = true; requestAnimationFrame(loop); }
            clearTimeout(focusT); focusT = setTimeout(() => { grp.visible = false; }, o.ms || 7000);
        }
        const hex = '#' + col.toString(16).padStart(6, '0'), callUp = $('px-call') && !$('px-call').classList.contains('hidden');
        cap.style.bottom = callUp ? '' : '56px'; cap.style.top = callUp ? '150px' : '';
        cap.style.borderColor = hex + '99';
        cap.innerHTML = '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:13px;color:' + hex + '">' + o.title + '</b>' +
            '<span style="font-size:10px;color:#94a3b8;white-space:nowrap">' + (o.where || '') + '</span></div><div style="margin-top:4px;line-height:1.45;color:#cbd5e1">' + o.text + '</div>';
        cap.style.display = 'block'; clearTimeout(capT); capT = setTimeout(() => { cap.style.display = 'none'; }, o.ms || 7000);
    }

    /* ------------------------------------------------ command table */
    const OUT = 'Outside · ', INS = 'Inside · ';
    function tank() { return typeof waterLevelMesh !== 'undefined' && waterLevelMesh ? wp(waterLevelMesh) : new THREE.Vector3(1.2, 10.9, -5.2); }
    const T = () => PX.t3d;
    const eqView = () => { const p = wp(T().vrfFan); return { pos: p, groundY: 0, cam: camNear(p, 3, 4.5, 10), floor: 'ALL' }; };
    const genView = () => { const p = wp(T().genLed); return { pos: p, groundY: 0, cam: camNear(p, 3, 4.5, 10), floor: 'ALL' }; };
    const tankView = () => { const p = tank(); return { pos: p, groundY: p.y - 1.2, cam: camNear(p, 6, 4, 10), floor: 'ALL' }; };
    const pergView = () => { const p = wp(T().louvres[0]); return { pos: p, groundY: 0.5, cam: camNear(p, 2, 6, 11), floor: 'ALL' }; };
    const aerial = () => ({ cam: VIEW.aerial, floor: 'ALL' });
    const num = (re, s) => +(s.match(re) || [0, 0])[1];

    const RULES = [
        [/pxIdentify\('(\w+)'\)/, (el, m) => ({ title: m[1] === 'spot' ? 'DALI spots located' : 'DMX RGBW strips located', where: INS + 'all floors (X-ray)', cam: VIEW.front, floor: 'ALL',
            text: 'Every ' + (m[1] === 'spot' ? 'DALI spot / pendant' : 'DMX RGBW strip') + ' pulses on the plan for 3 s, floor by floor, so you can see where each fixture is.' })],
        [/pxHclToggle/, el => ({ title: el.checked ? 'Human Centric Lighting ON' : 'Human Centric Lighting OFF', where: INS + 'whole house', cam: VIEW.living, floor: 'GF',
            text: el.checked ? 'All room lights now follow the time of day (' + Math.round(hclCct(PX.hcl.hour) / 25) * 25 + ' K at ' + $('px-hcl-time').innerText + '): warm at dawn, cool white at noon, warm again by evening.' : 'Lights return to their own colours.' })],
        [/pxHclPlay/, () => ({ title: PX.hcl.play ? '24 h day cycle running' : 'Day cycle stopped', where: INS + 'whole house', cam: VIEW.living, floor: 'GF',
            text: PX.hcl.play ? 'A full day plays in about 4 minutes: watch the room light colour shift from warm to cool white and back.' : 'Lights hold the current colour temperature.' })],
        [/pxClimOn/, el => Object.assign(eqView(), { title: el.checked ? 'VRF A/C ON' : 'VRF A/C OFF', where: OUT + 'VRF outdoor unit (rear of site)',
            text: el.checked ? 'The outdoor unit fan spins and the LED turns green. Each floor now cools toward its setpoint (see the temperatures in the list).' : 'The outdoor unit fan stops and the LED goes grey. Floor temperatures drift back toward 30 °C.' })],
        [/pxClimEvent\('cook'\)/, () => ({ title: 'Cooking event: VOC rising', where: INS + 'Ground floor kitchen', pos: roomPos('GF', /kitchen/i), groundY: LEVEL.GF, color: 0xfb923c,
            cam: (p => p ? [p.x + 5, p.y + 3.5, p.z + 7, p.x, p.y, p.z] : VIEW.living)(roomPos('GF', /kitchen/i)), floor: 'GF',
            text: 'Cooking fumes push GF air quality up. Above 500 ppb VOC the fresh-air boost (FAN) switches on for the floor until it clears.' })],
        [/pxClimEvent\('party'\)/, () => ({ title: 'Gathering event: CO₂ rising', where: INS + 'First floor family area', pos: roomPos('F1', /family/i), groundY: LEVEL.F1, color: 0xfb923c,
            cam: (p => p ? [p.x + 5, p.y + 3.5, p.z + 7, p.x, p.y, p.z] : VIEW.front)(roomPos('F1', /family/i)), floor: 'F1',
            text: 'Many people in the room: F1 CO₂ and temperature climb. Above 1000 ppm the fresh-air boost (FAN) switches on.' })],
        [/pxClimBrand/, el => ({ title: 'VRF gateway profile: ' + el.value, where: OUT + 'VRF outdoor unit', ...eqView(), text: 'The Modbus / RS485 gateway now speaks the ' + el.value + ' register map.' })],
        [/pxGarage\(\)/, () => ({ title: PX.sec.garageOpen ? 'Garage door opening' : 'Garage door closing', where: OUT + 'Garage (east side)', cam: [14, 7.5, 0, 13.3, 1.2, -11], floor: 'ALL', pos: wp(T().garageDoor), groundY: 0,
            text: PX.sec.garageOpen ? 'The door rolls up, the interior light comes on and the status LED turns green.' : 'The door rolls down, the interior light fades out and the status LED turns red.' })],
        [/pxBeams/, el => ({ title: el.checked ? 'Perimeter beams ARMED' : 'Perimeter beams DISARMED', where: OUT + 'all 4 boundaries', ...aerial(),
            text: el.checked ? 'Red infrared beams (2 heights) now run along the north, east, south and west boundaries. Crossing one raises the alarm.' : 'The beams are switched off: nothing crossing the boundary is detected.' })],
        [/pxOutage/, () => ({ title: PX.en.outage ? 'GRID OUTAGE' : 'Grid restored', where: OUT + 'whole estate', ...aerial(),
            text: PX.en.outage ? 'Mains is lost: the house runs on inverter / battery. The battery drains; below 60 % the pool, irrigation and EV charging shed, below 40 % A/C, cinema and audio shed, at 25 % the generator starts.' : 'Mains is back: shed circuits come back on and the generator stops.' })],
        [/pxGenerator/, () => Object.assign(genView(), { title: PX.en.gen ? 'Generator started' : 'Generator stopped', where: OUT + 'generator (rear of site)',
            text: PX.en.gen ? 'The generator relay closes: the status LED goes green and the unit glows while it runs, recharging the battery.' : 'The generator relay opens: LED grey, glow off.' })],
        [/pxMains/, el => Object.assign(tankView(), { title: el.checked ? 'Mains water restored' : 'Mains water cut', where: OUT + 'roof tank + underground sump',
            text: el.checked ? 'The underground sump refills from the mains, so the pump can lift water to the roof tank.' : 'The sump stops refilling. The roof tank keeps draining; when the sump is empty the pump trips on dry-run.' })],
        [/pxDrainSump/, () => Object.assign(tankView(), { title: 'Dry-run test', where: OUT + 'roof tank + sump',
            text: 'The sump is emptied and mains cut. The pump tries to prime, finds no water and locks out to protect itself. Use "Reset pump lockout" after.' })],
        [/pxResetPump/, () => Object.assign(tankView(), { title: 'Pump lockout reset', where: OUT + 'roof tank', text: 'The pump is allowed to prime again once the sump has water.' })],
        [/pxWaterAuto/, el => Object.assign(tankView(), { title: el.checked ? 'Auto pump control ON' : 'Auto pump control OFF', where: OUT + 'roof tank',
            text: el.checked ? 'Below 30 % the pump primes then fills the roof tank by itself; watch the water level rise.' : 'The pump no longer starts by itself: the tank only drains.' })],
        [/pxRain\(/, el => ({ title: el.checked ? 'Rain detected' : 'Rain stopped', where: OUT + 'whole estate', ...aerial(),
            text: el.checked ? 'Rain falls over the estate. Pergola louvres close and irrigation is locked out.' : 'Rain stops. Pergola louvres can reopen and irrigation is allowed again.' })],
        [/pxWind/, el => ({ title: 'Wind ' + el.value + ' km/h', where: OUT + 'pool pergola', ...pergView(),
            text: +el.value >= 40 ? 'Above 40 km/h the wind guard locks the louvres closed.' : 'Below 40 km/h the louvres follow the Auto / Open / Close setting.' })],
        [/pxForecast/, el => ({ title: 'Rain forecast ' + el.value + ' %', where: OUT + 'irrigation',
            text: +el.value >= 60 ? 'Forecast is high: scheduled irrigation will be skipped.' : 'Forecast is low: irrigation runs as normal.' })],
        [/pxPergola\('(\w+)'\)/, (el, m) => Object.assign(pergView(), { title: 'Pergola: ' + m[1], where: OUT + 'pool deck pergola',
            text: m[1] === 'open' ? 'The louvres tilt open (unless wind is 40 km/h or more).' : m[1] === 'closed' ? 'The louvres tilt shut over the pool deck.' : 'The louvres open in fine weather and close on rain or wind.' })],
        [/pxDoorbell/, () => ({ title: 'Doorbell chime', where: INS + 'every audio zone', cam: VIEW.front, floor: 'ALL', text: 'The chime plays through the ceiling speakers in every zone; the speaker icons pulse for 3 s.' })],
        [/pxAnnounce/, () => ({ title: 'Announcement tone', where: INS + 'every audio zone', cam: VIEW.front, floor: 'ALL', text: 'A three-note announcement plays in every audio zone; speakers pulse for 3 s.' })],
        [/pxSirenTest/, () => ({ title: 'Siren test', where: INS + 'every audio zone', cam: VIEW.front, floor: 'ALL', text: 'The acoustic alarm output sounds through the speakers (the same output the smoke and intrusion alarms use).' })],
        [/pxFingerprint\('(\w+)'\)/, (el, m) => {
            const led = scene.getObjectByName('NFC_LED'), lp = led ? wp(led) : new THREE.Vector3(0.7, LEVEL.GF + 1.3, 9), ok = m[1] !== 'unknown';
            return { title: ok ? 'Fingerprint accepted: ' + m[1] : PX.sec.fails === 0 ? 'Fingerprint rejected (3/3): ALARM' : 'Fingerprint rejected (' + PX.sec.fails + '/3)', where: OUT + 'front door', pos: lp, groundY: LEVEL.GF, floor: 'ALL', color: ok ? 0x10b981 : 0xef4444,
                cam: PX.sec.alert ? null : [lp.x + 3, LEVEL.GF + 2, lp.z + 6, lp.x, LEVEL.GF + 1.2, lp.z],
                text: ok ? 'The reader LED flashes blue then green and the door unlocks for ' + m[1] + '. A person stands at the door.' : 'The reader LED turns red and the door stays locked. Three rejected scans in a row raise an access-attempt alarm.' };
        }],
        [/pxVisitor\('([^']+)'\)/, (el, m) => ({ title: 'Visitor at ' + m[1], where: OUT + (/gate/i.test(m[1]) ? 'main gate' : 'front door'), pos: null, color: 0x3b82f6,
            text: 'The video intercom rings on the tablet / app and a visitor stands at the ' + (/gate/i.test(m[1]) ? 'gate' : 'door') + '. Answer to talk, Open to release it.' })],
        [/pxGlassBreak\(\)/, () => ({ title: 'Glass-break sensor', where: INS + 'forced window', color: 0xef4444, ms: 9000,
            text: 'The camera goes to the selected window: the pane cracks, shatters, an alarm sounds, a red marker shows the room and an intruder walks in. Presence sensors report his movement. Use RESET to clear.' })],
        [/pxBeamBreak\(\)/, () => ({ title: 'Perimeter beam broken', where: OUT + 'garden boundary', color: 0xef4444, ms: 9000,
            text: 'A beam is interrupted: the alarm sounds, that beam flashes white, a red marker shows the spot and an intruder with a torch crosses the garden toward the house. Use RESET to clear.' })]
    ];
    const CALL_RULES = [
        [/pxCallAnswer/, st => ({ title: 'Intercom answered', where: OUT + st, text: 'You are connected to the ' + st + ' station: live video and two-way audio.' })],
        [/pxCallOpen/, st => /gate/i.test(st) ? ({ title: 'Gate opening', where: OUT + 'main gate', pos: slidingGate ? wp(slidingGate) : null, groundY: 0, cam: [-3, 3.2, 31, 2.3, 1.3, 24.5], floor: 'ALL',
            text: 'The sliding gate opens from the intercom for the visitor.' }) : ({ title: 'Front door released', where: OUT + 'front door', text: 'The door lock is released: the reader LED flashes blue then green.' })],
        [/pxCallEnd/, st => ({ title: 'Call declined', where: OUT + st, text: 'The call is ended and the visitor leaves.' })]
    ];

    function attr(el) { return el.getAttribute('onclick') || el.getAttribute('onchange') || el.getAttribute('oninput') || ''; }
    function dispatch(rules, el, arg) {
        const code = attr(el);
        for (const [re, build] of rules) { const m = code.match(re); if (m) { try { const o = build(arg === undefined ? el : arg, m); if (o) show(o); } catch (e) { console.warn('estate focus', e); } return true; } }
        return false;
    }
    function wireUI() {
        const tab = $('tab-content-estate'); if (!tab) return;
        tab.addEventListener('click', e => { const b = e.target.closest('button'); if (b && tab.contains(b)) dispatch(RULES, b); });
        tab.addEventListener('change', e => { const i = e.target.closest('input,select'); if (i && tab.contains(i) && i.id !== 'px-glass-sel') dispatch(RULES, i); });
        const call = $('px-call'); let station = '';
        if (call) {
            call.addEventListener('click', e => { const b = e.target.closest('button'); if (b) station = (PX.sec.call && PX.sec.call.station) || station; }, true);
            call.addEventListener('click', e => { const b = e.target.closest('button'); if (b) dispatch(CALL_RULES, b, station); });
        }
    }

    const iv = setInterval(() => {
        if (typeof PX === 'undefined' || !PX.ready || typeof scene === 'undefined' || typeof renderer === 'undefined' || !$('tab-content-estate')) return;
        clearInterval(iv);
        try { buildFocus(); installTorch(); wireUI(); } catch (e) { console.warn('estate focus init failed', e); return; }
        setTimeout(() => { try { warmUp(); } catch (e) { console.warn('estate warm-up skipped', e); } }, 5000);
    }, 400);
})();
