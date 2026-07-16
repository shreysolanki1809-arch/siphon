// tasks.js
// Handles the "Phase Alignment" minigame (click wires in the shown order)
// and tracks overall task progress toward opening the escape gate.

const COLORS = ['red', 'yellow', 'blue'];
const SEQUENCE_LENGTH = 5;
const TIME_LIMIT = 10; // seconds per console

export class TaskManager {
  constructor(consoles, ui, audio, onAllComplete) {
    this.consoles = consoles;
    this.ui = ui;
    this.audio = audio;
    this.onAllComplete = onAllComplete;
    this.activeConsole = null;
    this.sequence = [];
    this.progressIndex = 0;
    this.timeLeft = 0;
    this.completedCount = 0;

    this.ui.taskButtons.forEach((btn) => {
      btn.addEventListener('click', () => this._handlePress(btn.dataset.color));
    });
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

  open(consoleObj) {
    this.activeConsole = consoleObj;
    this.sequence = Array.from({ length: SEQUENCE_LENGTH }, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
    this.progressIndex = 0;
    this.timeLeft = TIME_LIMIT;
    this.audio.taskOpen();
    this._renderSequence();
    this.ui.taskOverlay.classList.remove('hidden');
  }

  isOpen() { return this.activeConsole !== null; }

  _renderSequence() {
    this.ui.taskSequence.innerHTML = '';
    this.sequence.forEach((color, i) => {
      const chip = document.createElement('div');
      chip.className = `chip ${color}` + (i < this.progressIndex ? ' done' : '');
      this.ui.taskSequence.appendChild(chip);
    });
  }

  _handlePress(color) {
    if (!this.activeConsole) return;
    if (color === this.sequence[this.progressIndex]) {
      this.audio.wireCorrect();
      this.progressIndex += 1;
      this._renderSequence();
      if (this.progressIndex >= this.sequence.length) {
        this._succeed();
      }
    } else {
      this.audio.wireWrong();
      // wrong press: knock the timer down instead of instant-fail, keeps it forgiving
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
    const pct = Math.max(0, (this.timeLeft / TIME_LIMIT) * 100);
    this.ui.taskTimerFill.style.width = `${pct}%`;
    if (this.timeLeft <= 0) {
      // ran out of time: close it out, console stays unsolved, player can retry
      this._close();
    }
  }
}
