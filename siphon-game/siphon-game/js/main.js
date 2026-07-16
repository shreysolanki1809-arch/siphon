// main.js
// Wires the scene, camera, input, HUD, and all the game systems together
// and runs the animation loop.

import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Warden } from './warden.js';
import { TaskManager } from './tasks.js';
import { AudioManager } from './audio.js';

// ---------- DOM references ----------
const canvas = document.getElementById('game-canvas');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');
const restartBtn = document.getElementById('restart-btn');
const hud = document.getElementById('hud');
const taskProgressFill = document.getElementById('task-progress-fill');
const beltFill = document.getElementById('belt-fill');
const alertBanner = document.getElementById('alert-banner');
const interactPrompt = document.getElementById('interact-prompt');
const escapePrompt = document.getElementById('escape-prompt');

const ui = {
  taskOverlay: document.getElementById('task-overlay'),
  taskSequence: document.getElementById('task-sequence'),
  taskButtons: Array.from(document.querySelectorAll('.wire-btn')),
  taskTimerFill: document.getElementById('task-timer-fill'),
};

// ---------- Three.js core setup ----------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070a, 0.028);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Dim ambient + a cool rim light so the neon emissives do the real work
scene.add(new THREE.AmbientLight(0x1a2a33, 0.6));
const rim = new THREE.DirectionalLight(0x33e6ff, 0.25);
rim.position.set(10, 20, 10);
scene.add(rim);

const { wallBoxes, taskConsoles, escapeGate } = buildWorld(scene);

const audio = new AudioManager();
const player = new Player(scene);
const warden = new Warden(scene);
const taskManager = new TaskManager(taskConsoles, ui, audio, onGridFullyCharged);

// ---------- Input ----------
const input = { up: false, down: false, left: false, right: false, shift: false };
let interactHeld = false;

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': input.up = true; break;
    case 'KeyS': case 'ArrowDown': input.down = true; break;
    case 'KeyA': case 'ArrowLeft': input.left = true; break;
    case 'KeyD': case 'ArrowRight': input.right = true; break;
    case 'ShiftLeft': case 'ShiftRight': input.shift = true; break;
    case 'Space': e.preventDefault(); if (running) player.toggleDisguise(audio); break;
    case 'KeyE': if (!interactHeld) { interactHeld = true; handleInteract(); } break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': input.up = false; break;
    case 'KeyS': case 'ArrowDown': input.down = false; break;
    case 'KeyA': case 'ArrowLeft': input.left = false; break;
    case 'KeyD': case 'ArrowRight': input.right = false; break;
    case 'ShiftLeft': case 'ShiftRight': input.shift = false; break;
    case 'KeyE': interactHeld = false; break;
  }
});

function handleInteract() {
  if (!running || taskManager.isOpen()) return;
  const nearConsole = taskManager.nearestAvailableConsole(player.position);
  if (nearConsole) {
    taskManager.open(nearConsole);
    return;
  }
  if (escapeGate.active) {
    const d = Math.hypot(player.position.x - escapeGate.x, player.position.z - escapeGate.z);
    if (d < 3) win();
  }
}

// ---------- Game state ----------
let running = false;
let gridCharged = false;

function onGridFullyCharged() {
  gridCharged = true;
  escapeGate.active = true;
  escapeGate.material.emissiveIntensity = 1.2;
  escapeGate.light.intensity = 2.2;
}

startBtn.addEventListener('click', () => {
  audio.unlock();
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  running = true;
  clock.getDelta(); // discard the idle time spent on the start screen
});

restartBtn.addEventListener('click', () => window.location.reload());

function win() {
  endGame('GRID DRAINED', 'You escaped Unit 4 with the stolen power. The lower cities have light tonight.', true);
}
function lose() {
  endGame('CAUGHT', 'The Warden found you in the dark. The grid stays locked.', false);
}
function endGame(title, message, didWin) {
  running = false;
  endTitle.textContent = title;
  endTitle.style.color = didWin ? '#7cffcb' : '#ff3b3b';
  endTitle.style.textShadow = didWin ? '0 0 12px #7cffcb' : '0 0 12px #ff3b3b';
  endMessage.textContent = message;
  hud.classList.add('hidden');
  endScreen.classList.remove('hidden');
  didWin ? audio.win() : audio.lose();
}

// ---------- Camera follow (angled top-down, matches the Siphoner's-eye-view in the lore) ----------
const camOffset = new THREE.Vector3(0, 13, 9);
function updateCamera() {
  const target = player.position.clone().add(camOffset);
  camera.position.lerp(target, 0.12);
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}

// ---------- Main loop ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (running) {
    if (!taskManager.isOpen()) {
      player.update(dt, input, wallBoxes, audio);
    }
    const caught = warden.update(dt, player, audio);
    taskManager.update(dt);
    updateHUD();
    if (caught) lose();
  }

  updateCamera();
  renderer.render(scene, camera);
}

function updateHUD() {
  taskProgressFill.style.width = `${taskManager.progressPercent}%`;
  beltFill.style.width = `${player.beltPercent}%`;
  alertBanner.classList.toggle('hidden', warden.state !== 'chase');

  const nearConsole = !taskManager.isOpen() && taskManager.nearestAvailableConsole(player.position);
  interactPrompt.classList.toggle('hidden', !nearConsole);

  const nearGate = escapeGate.active
    && Math.hypot(player.position.x - escapeGate.x, player.position.z - escapeGate.z) < 3;
  escapePrompt.classList.toggle('hidden', !nearGate);
}

animate();
