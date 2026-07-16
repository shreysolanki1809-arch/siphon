// capture.js
// Propnight-style "caught" state. Instead of an instant loss, the Warden
// carries you to the nearest Drain Chair. You mash SPACE to struggle free
// before the drain timer runs out. The Warden can guard the chair, which
// slows your struggle progress a lot (mirrors hook-camping tension).
// In a future multiplayer build, other Siphoners freeing you plugs in here
// alongside (or instead of) the solo struggle-mash mechanic.

const DRAIN_TIME = 20;       // seconds until the Siphoner is fully drained (eliminated)
const STRUGGLE_TO_FREE = 100;
const MASH_GAIN = 9;         // struggle % gained per mash
const DECAY_NORMAL = 6;      // struggle % lost per second, unguarded
const DECAY_GUARDED = 16;    // struggle % lost per second, Warden standing near the chair
const GUARD_RADIUS = 4.5;    // how close the Warden must be to "guard" the chair

export class CaptureManager {
  constructor(chairs, ui, audio) {
    this.chairs = chairs;
    this.ui = ui;
    this.audio = audio;
    this.active = false;
    this.chair = null;
    this.drainTime = 0;
    this.struggle = 0;
  }

  start(fromPos) {
    let nearest = this.chairs[0];
    let best = Infinity;
    for (const c of this.chairs) {
      const d = Math.hypot(fromPos.x - c.x, fromPos.z - c.z);
      if (d < best) { best = d; nearest = c; }
    }
    this.chair = nearest;
    this.active = true;
    this.drainTime = DRAIN_TIME;
    this.struggle = 0;
    this.ui.captureHud.classList.remove('hidden');
  }

  mash() {
    if (!this.active) return;
    this.struggle = Math.min(STRUGGLE_TO_FREE, this.struggle + MASH_GAIN);
  }

  // Returns 'freed', 'drained', or null (still in progress / inactive)
  update(dt, wardenPos) {
    if (!this.active) return null;

    const wardenGuarding = Math.hypot(wardenPos.x - this.chair.x, wardenPos.z - this.chair.z) < GUARD_RADIUS;
    this.ui.guardWarning.classList.toggle('hidden', !wardenGuarding);

    this.drainTime -= dt;
    this.struggle = Math.max(0, this.struggle - (wardenGuarding ? DECAY_GUARDED : DECAY_NORMAL) * dt);

    this.ui.drainFill.style.width = `${(this.drainTime / DRAIN_TIME) * 100}%`;
    this.ui.struggleFill.style.width = `${this.struggle}%`;

    if (this.struggle >= STRUGGLE_TO_FREE) {
      this._end();
      return 'freed';
    }
    if (this.drainTime <= 0) {
      this._end();
      return 'drained';
    }
    return null;
  }

  _end() {
    this.active = false;
    this.ui.captureHud.classList.add('hidden');
    this.ui.guardWarning.classList.add('hidden');
  }
}
