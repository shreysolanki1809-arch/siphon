# SIPHON — Prototype

> Dystopian cyberpunk stealth-heist party game. Steal power from the grid, dodge the Warden, escape before it catches you.

This is the **first playable milestone**: a single-player prototype (you vs. an AI-controlled Warden) on one map, **The High-Voltage Core**. It runs entirely in the browser with **zero build step** and **zero external asset files** — sound is generated procedurally and all models are simple emissive-neon primitives, so you can play it immediately and swap in real assets later without touching the game logic.

## Play it

Because this uses ES modules, opening `index.html` directly via `file://` may fail due to browser CORS rules on modules. Serve the folder locally instead:

```bash
npx serve .
# or
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

It's also ready to publish straight to **GitHub Pages** — push this repo, enable Pages on the `main` branch root, done.

## Controls

| Key | Action |
|---|---|
| `W A S D` / arrows | Move |
| `Shift` (held) | Run — faster, but louder and easier for the Warden to spot |
| `Space` | Toggle Holo-Belt disguise (15s active, then it needs ~10s to recharge) |
| `E` | Interact with a task console / escape gate |

## Win / lose

- **Win:** Complete all 3 task consoles ("Phase Alignment" — click the wire colors in the order shown before the timer runs out), then reach the glowing exit gate and press `E`.
- **Lose:** The Warden catches you. It patrols a fixed route, notices you if you're in its vision cone (or very close), and gives chase. Running widens how far it can notice you from. The Holo-Belt disguise defeats detection unless the Warden is standing right on top of you.

## Project structure

```
siphon-game/
├── index.html          # DOM shell: start/end screens, HUD, task minigame overlay
├── css/
│   └── style.css        # neon/dark UI styling
├── js/
│   ├── main.js           # scene setup, camera, input, game loop, HUD wiring
│   ├── world.js           # map geometry (walls, transformers, consoles, gate) + collision
│   ├── player.js           # Siphoner movement + Holo-Belt disguise mechanic
│   ├── warden.js            # Warden AI: patrol / chase / search state machine
│   ├── tasks.js               # Phase Alignment minigame + overall progress tracking
│   └── audio.js                 # procedural Web Audio sound (see below to swap in real files)
└── assets/
    ├── models/    # drop your .glb/.gltf files here
    ├── sounds/    # drop your real sound files here
    └── textures/  # drop your texture maps here
```

Built with [Three.js](https://threejs.org/) r160 via CDN import map — no `npm install` required for the prototype itself.

## Swapping in your own assets

**3D models:** Right now the player, Warden, transformers, consoles, and gate are all primitive `THREE.Mesh` shapes built directly in `world.js`, `player.js`, and `warden.js`. To use real models:
1. Drop `.glb` files into `assets/models/`.
2. In the relevant file, replace the `new THREE.Mesh(...)` construction with a `GLTFLoader` load call (add `"three/addons/loaders/GLTFLoader.js"` to the import map, same pattern as the `three` entry already there).
3. Keep the same variable name (e.g. `this.mesh`) so the rest of the game (movement, collision, camera-follow) doesn't need to change.

**Sound:** `audio.js` exposes one method per game event (`footstep()`, `disguiseOn()`, `wardenAlert()`, `win()`, etc.). Right now each one generates a tone with the Web Audio API. To use real recorded/3D sound:
1. Drop files into `assets/sounds/`.
2. Replace the body of each method with an `Audio`/`AudioBufferSourceNode` playback call instead of `this._tone(...)`.
3. Nothing outside `audio.js` needs to change — every other file just calls `audio.footstep()`, `audio.win()`, etc.

## What's next (not in this milestone)

Per the design doc, these are the deliberate next steps, roughly in order:
1. **Map rotation** — reskin this same system into "The Sunken Scrapyard" and "The Server Spire" as alternate maps (moving crane traversal, sound-sensitive floor panel).
2. **Full roster** — the 7 Siphoners' passive abilities (currently there's just one generic Siphoner).
3. **Lore Drops** — an optional 4th "risk" node per map that doesn't count toward the task bar but unlocks story fragments.
4. **Real multiplayer** — a Node.js/WebSocket server so a real player can control the Warden against real Siphoners, instead of the AI Warden here.

## Known limitations of this milestone

- Single map, single Siphoner (no roster yet).
- Warden AI uses distance + facing-angle checks, not full line-of-sight raycasting against walls — it can occasionally "see" through a nearby wall corner. Fine for a first playable pass; worth revisiting once real level art replaces the placeholder maze.
- No persistence/save state — refreshing always restarts clean.
