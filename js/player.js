// player.js
// The Siphoner: WASD movement, Shift to run (louder + easier to spot),
// Space to toggle the Holo-Belt disguise (15s duration, recharges after).

import * as THREE from 'three';
import { collides } from './world.js';

const WALK_SPEED = 4.2;
const RUN_SPEED = 7.5;
const BELT_MAX = 15;      // seconds of disguise
const BELT_RECHARGE = 10; // seconds to refill after fully drained

export class Player {
  constructor(scene) {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2fe6c9, emissive: 0x0fae94, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.5,
    });
    this.mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 4, 8), bodyMat);
    this.mesh.position.set(30, 1.05, -30);
    scene.add(this.mesh);

    // Disguise prop shown instead of the body while the Holo-Belt is active
    const propMat = new THREE.MeshStandardMaterial({ color: 0xffa23a, emissive: 0xffa23a, emissiveIntensity: 0.3 });
    this.disguiseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 12), propMat);
    this.disguiseMesh.visible = false;
    scene.add(this.disguiseMesh);

    this.velocity = new THREE.Vector3();
    this.running = false;
    this.disguised = false;
    this.beltCharge = BELT_MAX; // seconds remaining
    this.beltRecharging = false;
    this.beltOnCooldown = false; // true right after a full drain, until it recharges
    this._footstepTimer = 0;
  }

  get position() { return this.mesh.position; }

  toggleDisguise(audio) {
    if (this.beltOnCooldown) return; // fully drained, must wait
    this.disguised = !this.disguised;
    this.mesh.visible = !this.disguised;
    this.disguiseMesh.visible = this.disguised;
    if (this.disguised) audio.disguiseOn(); else audio.disguiseOff();
  }

  update(dt, input, wallBoxes, audio) {
    this.running = input.shift && (input.up || input.down || input.left || input.right);
    const speed = this.running ? RUN_SPEED : WALK_SPEED;

    const move = new THREE.Vector3();
    if (input.up) move.z -= 1;
    if (input.down) move.z += 1;
    if (input.left) move.x -= 1;
    if (input.right) move.x += 1;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
      const nx = this.mesh.position.x + move.x;
      const nz = this.mesh.position.z + move.z;
      if (!collides(nx, this.mesh.position.z, wallBoxes)) this.mesh.position.x = nx;
      if (!collides(this.mesh.position.x, nz, wallBoxes)) this.mesh.position.z = nz;

      this.mesh.rotation.y = Math.atan2(move.x, move.z);
      this.disguiseMesh.position.copy(this.mesh.position);

      // footstep cadence
      this._footstepTimer -= dt;
      if (this._footstepTimer <= 0) {
        audio.footstep(this.running);
        this._footstepTimer = this.running ? 0.28 : 0.42;
      }
    }
    this.disguiseMesh.position.copy(this.mesh.position);

    // Holo-Belt battery logic
    if (this.disguised) {
      this.beltCharge = Math.max(0, this.beltCharge - dt);
      if (this.beltCharge <= 0) {
        // flickers out and exposes the player
        this.disguised = false;
        this.mesh.visible = true;
        this.disguiseMesh.visible = false;
        this.beltOnCooldown = true;
        audio.disguiseOff();
      }
    } else if (this.beltOnCooldown || this.beltCharge < BELT_MAX) {
      this.beltCharge = Math.min(BELT_MAX, this.beltCharge + (dt * BELT_MAX) / BELT_RECHARGE);
      if (this.beltCharge >= BELT_MAX) this.beltOnCooldown = false;
    }
  }

  get beltPercent() { return (this.beltCharge / BELT_MAX) * 100; }
}
