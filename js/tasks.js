// tasks.js
// Two repair minigames living on the map's broken machines:
//   - "rewire"  : click wires in the shown color order (Phase Alignment)
//   - "repack"  : hit the button as a marker crosses a moving zone (Core Repacking)
// Both count toward the same overall grid-charge progress bar.

const COLORS = ['red', 'yellow', 'blue'];
const REWIRE_SEQUENCE_LENGTH = 5;
const REWIRE_TIME_LIMIT = 10;

const REPACK_HITS_NEEDED = 4;
const REPACK_TIME_LIMIT = 14;
const REPACK_MARKER_SPEED = 0.9; // track-widths per second, bounces back and forth
const REPACK_ZONE_MIN = 0.42; // matches .repack-zone CSS left%
const REPACK_ZONE_MAX = 0.58; // left% + width%

export class TaskManager {
  constructor(consoles, ui, audio, onAllComplete) {
    this.consoles = consoles;
    this.ui = ui;
    this.audio = audio;
    this.onAllComplete = onAllComplete;
    this.activeConsole = null;
    this.completedCount = 0;

    // rewire state
    this.sequence = [];
    this.progressIndex = 0;

    // repack state
    this.markerPos = 0;
    this.markerDir = 1;
    this.hits = 0;

    this.timeLeft = 0;

    this.ui.taskButtons.forEach((btn) => {
      btn.addEventListener('click', () => this._handleWirePress(btn.dataset.color));
    });
    this.ui.repackBtn.addEventListener('click', () => this._handleRepackHit());
  }

  get progressPercent() {
    return (this.completedCount / this.consoles.length) * 100;
  }

  nearestAvailableConsole(pos, range = 2.2) {
    for (const c of this.consoles) {
      if (c.done) continue;
      const d = Math.hypot(pos.x - c.x, pos.z - c.z);
      if (d < range) return c;
    }
    return null;
  }

  isOpen() { return this.activeConsole !== null; }

  open(consoleObj) {
    this.activeConsole = consoleObj;
    this.timeLeft = consoleObj.type === 'repack' ? REPACK_TIME_LIMIT : REWIRE_TIME_LIMIT;
    this.audio.taskOpen();

    this.ui.taskRewire.classList.toggle('hidden', consoleObj.type !== 'rewire');
    this.ui.taskRepack.classList.toggle('hidden', consoleObj.type !== 'repack');

    if (consoleObj.type === 'rewire') {
      this.sequence = Array.from(
        { length: REWIRE_SEQUENCE_LENGTH },
        () => COLORS[Math.floor(Math.random() * COLORS.length)],
      );
      this.progressIndex = 0;
      this._renderSequence();
    } else {
      this.hits = 0;
      this.markerPos = 0;
      this.markerDir = 1;
      this._renderHits();
    }

    this.ui.taskOverlay.classList.remove('hidden');
  }

  // ---------- Rewire (Phase Alignment) ----------
  _renderSequence() {
    this.ui.taskSequence.innerHTML = '';
    this.sequence.forEach((color, i) => {
      const chip = document.createElement('div');
      chip.className = `chip ${color}` + (i < this.progressIndex ? ' done' : '');
      this.ui.taskSequence.appendChild(chip);
    });
  }

  _handleWirePress(color) {
    if (!this.activeConsole || this.activeConsole.type !== 'rewire') return;
    if (color === this.sequence[this.progressIndex]) {
      this.audio.wireCorrect();
      this.progressIndex += 1;
      this._renderSequence();
      if (this.progressIndex >= this.sequence.length) this._succeed();
    } else {
      this.audio.wireWrong();
      this.timeLeft = Math.max(0, this.timeLeft - 2);
    }
  }

  // ---------- Repack (Core Repacking, rhythm) ----------
  _renderHits() {
    this.ui.repackHits.innerHTML = '';
    for (let i = 0; i < REPACK_HITS_NEEDED; i += 1) {
      const chip = document.createElement('div');
      chip.className = 'chip blue' + (i < this.hits ? ' done' : '');
      this.ui.repackHits.appendChild(chip);
    }
  }

  _handleRepackHit() {
    if (!this.activeConsole || this.activeConsole.type !== 'repack') return;
    const inZone = this.markerPos >= REPACK_ZONE_MIN && this.markerPos <= REPACK_ZONE_MAX;
    if (inZone) {
      this.audio.wireCorrect();
      this.hits += 1;
      this._renderHits();
      if (this.hits >= REPACK_HITS_NEEDED) this._succeed();
    } else {
      this.audio.wireWrong();
      this.timeLeft = Math.max(0, this.timeLeft - 2);
    }
  }

  _succeed() {
    this.activeConsole.done = true;
    this.activeConsole.material.emissiveIntensity = 0.15;
    this.completedCount += 1;
    this.audio.taskComplete();
    this._close();
    if (this.completedCount >= this.consoles.length) this.onAllComplete();
  }

  _close() {
    this.activeConsole = null;
    this.ui.taskOverlay.classList.add('hidden');
  }

  update(dt) {
    if (!this.activeConsole) return;
    this.timeLeft -= dt;

    if (this.activeConsole.type === 'repack') {
      this.markerPos += this.markerDir * REPACK_MARKER_SPEED * dt;
      if (this.markerPos >= 1) { this.markerPos = 1; this.markerDir = -1; }
      if (this.markerPos <= 0) { this.markerPos = 0; this.markerDir = 1; }
      this.ui.repackMarker.style.left = `${this.markerPos * 100}%`;
    }

    const limit = this.activeConsole.type === 'repack' ? REPACK_TIME_LIMIT : REWIRE_TIME_LIMIT;
    const pct = Math.max(0, (this.timeLeft / limit) * 100);
    this.ui.taskTimerFill.style.width = `${pct}%`;
    if (this.timeLeft <= 0) this._close(); // times out unsolved; player can retry later
  }
}
