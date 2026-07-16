// warden.js
// The Warden: patrols a fixed loop, and switches to chasing the Siphoner when
// it "notices" them — close enough, in front of it, and not disguised (or too
// close even while disguised). No line-of-sight raycasting in this prototype;
// distance + facing angle is enough to make it feel dangerous without needing
// full nav-mesh pathfinding yet.

import * as THREE from 'three';

const PATROL_SPEED = 3.2;
const CHASE_SPEED = 5.6;
const VISION_RANGE_WALK = 9;
const VISION_RANGE_RUN = 14;
const VISION_HALF_ANGLE = Math.PI / 3; // 60 degrees either side
const CATCH_RANGE = 1.1;
const LOSE_INTEREST_TIME = 4; // seconds without seeing the player before giving up

const PATROL_ROUTE = [
  new THREE.Vector3(-25, 0, -5),
  new THREE.Vector3(15, 0, -20),
  new THREE.Vector3(5, 0, 25),
  new THREE.Vector3(-30, 0, 35),
  new THREE.Vector3(0, 0, 0),
];

export class Warden {
  constructor(scene) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x220608, emissive: 0xff2020, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.9), mat);
    this.mesh.position.set(-25, 1.05, -5);
    scene.add(this.mesh);

    const eyeLight = new THREE.PointLight(0xff2020, 1.0, 6);
    eyeLight.position.set(0, 0.6, 0.5);
    this.mesh.add(eyeLight);

    this.state = 'patrol'; // patrol | chase | search
    this._routeIndex = 0;
    this._searchTimer = 0;
    this._lastKnown = null;
  }

  get position() { return this.mesh.position; }

  _canSee(player) {
    const dx = player.position.x - this.mesh.position.x;
    const dz = player.position.z - this.mesh.position.z;
    const dist = Math.hypot(dx, dz);

    const visionRange = player.running ? VISION_RANGE_RUN : VISION_RANGE_WALK;
    if (player.disguised) {
      // disguise defeats detection unless the Warden is right on top of the player
      return dist < 1.6;
    }
    if (dist > visionRange) return false;

    const forward = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    const toPlayer = new THREE.Vector3(dx, 0, dz).normalize();
    const angle = forward.angleTo(toPlayer);
    return angle < VISION_HALF_ANGLE || dist < 2.2; // always notice if very close, regardless of facing
  }

  // guardChairPos: when a Siphoner is captured, pass the chair's position here
  // and the Warden abandons patrol/chase to camp it instead.
  update(dt, player, audio, guardChairPos = null) {
    if (guardChairPos) {
      this.state = 'guard';
      const dir = new THREE.Vector3().subVectors(guardChairPos, this.mesh.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 1.5) {
        dir.normalize();
        this.mesh.position.x += dir.x * PATROL_SPEED * dt;
        this.mesh.position.z += dir.z * PATROL_SPEED * dt;
        this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
      return false; // can't "catch" someone already captured
    }

    const sees = this._canSee(player);

    if (sees) {
      if (this.state !== 'chase') audio.wardenAlert();
      this.state = 'chase';
      this._searchTimer = LOSE_INTEREST_TIME;
      this._lastKnown = player.position.clone();
    } else if (this.state === 'chase') {
      this._searchTimer -= dt;
      if (this._searchTimer <= 0) {
        this.state = 'patrol';
        audio.wardenLost();
      } else {
        this.state = 'search';
      }
    }

    let target;
    let speed;
    if (this.state === 'chase') {
      target = player.position;
      speed = CHASE_SPEED;
    } else if (this.state === 'search' && this._lastKnown) {
      target = this._lastKnown;
      speed = CHASE_SPEED * 0.8;
    } else {
      target = PATROL_ROUTE[this._routeIndex];
      speed = PATROL_SPEED;
      if (this.mesh.position.distanceTo(target) < 1.2) {
        this._routeIndex = (this._routeIndex + 1) % PATROL_ROUTE.length;
      }
    }

    const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.01) {
      dir.normalize();
      this.mesh.position.x += dir.x * speed * dt;
      this.mesh.position.z += dir.z * speed * dt;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }

    const distToPlayer = this.mesh.position.distanceTo(player.position);
    const caughtWhileVisible = !player.disguised || distToPlayer < 0.8;
    return this.state === 'chase' && distToPlayer < CATCH_RANGE && caughtWhileVisible;
  }
}
