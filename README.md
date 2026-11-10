# Cecil – 3D Smart Home Simulation

Interactive 3D simulation of a four-level smart home (basement, ground, first and second floor, roof) built with Three.js. Explore the building, control lighting, audio, security, pool, EV charging and the basement cinema.

## Run

```
npm install
npm run dev
```

Opens http://localhost:8000/3d_smart_home_simulation.html. Internet is needed: Three.js, Tailwind and icons load from CDNs.

## Features

- Floor-by-floor 3D model with orbit view and walk mode
- Lighting zones with dimming, RGBW colour and scenes (dusk, night, away, party)
- Device layer: spots, speakers, presence sensors, smoke detectors, with room tooltips
- 14 CCTV cameras (pole, wall and ceiling dome mounts) with a camera selector
- Multiroom audio, presence automation, smoke alarm
- Basement cinema: projector, screen masking, scenes, climate, and synthesised Web Audio sound (cinematic score, game chiptune, sport crowd) that follows volume, mute and sound mode
- Pool lighting scenes, irrigation, water tank, sliding gate, EV charger, solar readout

## Files

| Path | Purpose |
|---|---|
| `3d_smart_home_simulation.html` | The whole app (HTML, CSS, JS) |
| `plan_textures.js` | Floor plan texture data |
| `3d_smart_home_simulation.backup.html` | Older copy of the app |
| `building drawings/` | Source plans and reference pictures |

## Notes

- All device behaviour is simulated. CCTV and pool fixture positions are indicative, not taken from the drawings.
- Cinema audio needs a click on the page first (browser autoplay rules).
- Large source PDFs in `3d layout/` are git-ignored.
