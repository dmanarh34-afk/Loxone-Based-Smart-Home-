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
| `building drawings/` | Source plans and reference pictures |

## Notes

- All device behaviour is simulated. CCTV and pool fixture positions are indicative, not taken from the drawings.
- Cinema audio needs a click on the page first (browser autoplay rules).
- Large source PDFs in `3d layout/` are git-ignored.

## 3D model credits

- `models/cinema_sofa.glb`: "Cinema Theater Lounge Sofa" by Pipa (https://sketchfab.com/Pipa4a), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/cinema-theater-lounge-sofa-2211e6246174439b8c87fd3e81b778e0. Recoloured orange in the simulation.
- `models/living_room.glb`: "living room interior FREE" by dasy444, Sketchfab Free Standard licence. Source: https://sketchfab.com/3d-models/living-room-interior-free-efeff8e4978e489e82dbb06a86f697f8. Only the furniture is used.
- `textures/teak/`: "Teak Wood Planks PBR Texture" by CGAxis (https://cgaxis.com/product/teak-wood-planks-pbr-texture/), 4K set downscaled to 2K. Used on the basement cinema floor.
- `models/bar_stool.glb`: "Bar Stool" by samixalam (https://sketchfab.com/samixalam), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/bar-stool-dc5042a8fdcf400e9d0d3ffc17c3ca49. Decimated and merged for the web (original 141 MB, 1.3 M triangles).
- `models/silver_maple.glb`: "Silver Maple 3D Model 6.5m (10935)" by CGAxis (https://cgaxis.com/product/silver-maple-3d-model-6-5m/). Converted offline from the OBJ pack (branches decimated, leaf cards thinned) for the web. Replaces the three broadleaf trees on the compound.
- `models/bmw_x7.glb`: "BMW X7 M60i" by KOElkast1007 (https://sketchfab.com/koelkastasbers), Sketchfab Standard licence. Source: https://sketchfab.com/3d-models/bmw-x7-m60i-5664218111d345c6b79c64ae48c6dd8b. Decimated and merged for the web.
- `models/tesla_model3.glb`: "Tesla 2018 Model 3" by Ameer Studio (https://sketchfab.com/uchiha.321abc), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/tesla-2018-model-3-5ef9b845aaf44203b6d04e2c677e444f. Decimated and merged for the web.
- `models/ev_charger.glb`: "EV charger case with two wallboxes" kiosk, converted from the supplied STEP CAD file (OpenCascade) and decimated for the web. Source: ev-charger-case-with-two-wallbox-s-1 (check the original author and licence before publishing).
- `models/water_waves.bin`: wave animation from "water waves" by UJWAL (https://sketchfab.com/Ujwal-Chauhan), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/water-waves-142c2596d1944cd0bf4fc1f490c4c248. The 163 MB GLB was packed offline into a 2.4 MB loop of 60 frames and drives the main pool surface.
- `walkin_closet.js` + `textures/closet/`: second-floor walk-in closet modelled from the supplied reference scene (oak veneer and dark marble textures taken from that scene, downscaled to 512 px).
- `models/bollard.glb`: "Modern Outdoor Bollard Light" by Parth (https://sketchfab.com/ptl.king), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/modern-outdoor-bollard-light-da027f300b8541519dc1dc84f4f42468. Textures cut to 256 px.
- `textures/brick/`: "Grey Stone Brick Wall (4573)" PBR texture by CGAxis (https://cgaxis.com/product/grey-stone-brick-wall-4573/), 4K set cut to 1K. Used on every wall (shell, partitions, boundary wall, shed, garage).
- `models/manager_office.glb`: "manager office" by sight (https://sketchfab.com/sight), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/manager-office-8bea2d8ff8ee4b2c9566c2cdb1da2561. Decimated and merged for the web; only the executive desk + chairs are used in the study (`study_office.js`).
- `models/water_tank.glb`: "Plastic Water Tank 500 Lts" by Maggadog (https://sketchfab.com/mwangiwambui.wambui), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/plastic-water-tank-500-lts-52c926f621ff4d61a2fb66a9160b3c91.
- `models/solar_panel.glb`: "Solar Panel low poly" by adventurer (https://sketchfab.com/ahmagh2e), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/solar-panel-low-poly-be81ba18edb04e03a68954d1ae680a6d.
- `models/bedroom_bw.glb` (male suite): "Master Black&White Bedroom" by Ren Viro Store (https://sketchfab.com/renviros), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/master-blackwhite-bedroom-4a2ea32c65dd48fe991f17473c92ede4. Trimmed to the bed, rug, bedside table, lamps and picture (`bedroom_suites.js`).
- `models/bedroom_modern.glb` (female suite): "Modern Bedroom" by dylanheyes (https://sketchfab.com/dylanheyes), licensed CC BY 4.0. Source: https://sketchfab.com/3d-models/modern-bedroom-ab1e4522dcae4af1bbd39299ab382f37. Trimmed to the bed, rug, end tables, lamps and painting.
- `models/road.glb`: "Road_ Avenue_ street" by adventurer (https://sketchfab.com/ahmagh2e), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/road--avenue--street-7f657c3eceb343ceaf5e542c50dab27a. Textures cut to 1K; tiled along the garage drive.
- `models/inverter.glb`: "Solar Edge Single Phase Inverter 240 V" by One80 Solar (https://sketchfab.com/one80solar), licensed CC BY 4.0. Source: https://sketchfab.com/3d-models/solar-edge-single-phase-inverter-240-v-43a0699c5331421e9446c570196b1a5e.
- `models/bathroom_fixtures.glb` (female suite bathroom): "Gebron Bathroom 2 - 64 Tub 4-11wall" by bryce.ussery (https://sketchfab.com/bryce.ussery), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/gebron-bathroom-2-64-tub-4-11wall-39a29579410e460fa61ab8d1281ad3c1. Only the tub, toilet, double vanity and towel bar are used, at true size.

- `models/snake_plant.glb`: "Low-poly snake plant" by assetfactory (https://sketchfab.com/assetfactory), https://sketchfab.com/3d-models/low-poly-snake-plant-237210b3b20a492c851c0145fe316ea7. Licence: Sketchfab Standard (https://sketchfab.com/licenses), not Creative Commons, so check it allows your use before redistributing. Used on the pool deck.
- `models/fern.glb`: "Decor plant - Maidenhair fern" by assetfactory (https://sketchfab.com/assetfactory), https://sketchfab.com/3d-models/decor-plant-maidenhair-fern-cf626a1f25434897a957fdedc0823810. Licence: Sketchfab Standard (https://sketchfab.com/licenses), not Creative Commons, so check it allows your use before redistributing. Used on the pool deck.
- `models/dining_room.glb`: "Modern Dining Room" by dylanheyes (https://sketchfab.com/dylanheyes), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/modern-dining-room-df3f3c9f6233447eb8b7ee129f3bace5. Only the table, chairs, rug, centrepiece and pendant light are used.
- `models/kitchen_main.glb`: "Kitchen Modern Set 3 3D Model" by ParienteChido (https://sketchfab.com/ParienteChido), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/kitchen-modern-set-3-3d-model-09474ccc5d484c2e887913af03b4e08a. Used for the ground-floor kitchen, cropped to fit.
- `models/kitchen_wet.glb`: "Modern Kitchen" by dylanheyes (https://sketchfab.com/dylanheyes), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/modern-kitchen-9843a830b96142a9a53f45f25304d93c. Cabinet run only, used for the ground-floor wet kitchen, cropped to fit.
- `models/sauna.glb`: "Sauna" by PrincessSayumi92 (https://sketchfab.com/princesssayumi92), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/sauna-a86c962c5e504415bfa720a220c3cc32. Used in the ground-floor sauna cell.
- `models/bedroom_corner.glb`: "Bedroom Corner" by syntheticplants (https://sketchfab.com/syntheticplants), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://sketchfab.com/3d-models/bedroom-corner-cd956b2abec04b52ac48bea1ec141d60. Used in the ground-floor guest bedroom and boy's quarters.
