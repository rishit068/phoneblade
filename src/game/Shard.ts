import * as THREE from "three";
import { buildFruitMesh } from "./Fruit";
import type { FruitKind } from "./types";

const SHARD_LIFE_SEC = 0.65;

/**
 * One of two halves spawned when a fruit is sliced. Re-uses the fruit's
 * mesh factory but scales it down on one axis so two shards together
 * suggest "split in half". Fades to transparent over its life.
 */
export class Shard {
  readonly mesh: THREE.Object3D;
  readonly velocity: THREE.Vector3;
  readonly angularVelocity: THREE.Vector3;
  age = 0;
  readonly life = SHARD_LIFE_SEC;
  private materials: THREE.Material[] = [];

  constructor(params: {
    kind: FruitKind;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    radius: number;
    /** Which half this shard is: -1 or +1 along the split axis. */
    side: -1 | 1;
    /** Local split axis (unit vector in world-space XY). */
    splitAxis: THREE.Vector3;
  }) {
    this.velocity = params.velocity.clone();
    this.angularVelocity = params.angularVelocity.clone();
    this.mesh = buildFruitMesh(params.kind);
    this.mesh.scale.multiplyScalar(params.radius);

    // Squash along split axis to suggest a half. Aligns local Z to splitAxis.
    const axis = params.splitAxis.clone().normalize();
    // Build a basis where Z is the split axis.
    const z = axis;
    const x = new THREE.Vector3(0, 0, 1).cross(z);
    if (x.lengthSq() < 0.001) x.set(1, 0, 0);
    x.normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    const m = new THREE.Matrix4().makeBasis(x, y, z);
    this.mesh.applyMatrix4(m);
    this.mesh.scale.z *= 0.55;
    // Nudge slightly off-center so the cut line reads.
    this.mesh.position
      .copy(params.position)
      .addScaledVector(axis, params.radius * 0.18 * params.side);

    // Collect materials and make them transparent so we can fade.
    this.mesh.traverse((o) => {
      const meshObj = o as THREE.Mesh;
      if (meshObj.isMesh && meshObj.material) {
        const mats = Array.isArray(meshObj.material)
          ? meshObj.material
          : [meshObj.material];
        for (const mat of mats) {
          mat.transparent = true;
          mat.depthWrite = false;
          this.materials.push(mat);
        }
      }
    });
  }

  /** Returns false when the shard should be removed. */
  update(dt: number, gravity: number): boolean {
    this.age += dt;
    if (this.age >= this.life) return false;
    this.velocity.y -= gravity * dt;
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;
    this.mesh.rotation.x += this.angularVelocity.x * dt;
    this.mesh.rotation.y += this.angularVelocity.y * dt;
    this.mesh.rotation.z += this.angularVelocity.z * dt;

    const t = this.age / this.life;
    const opacity = (1 - t) ** 1.2;
    for (const mat of this.materials) {
      (mat as THREE.MeshStandardMaterial).opacity = opacity;
    }
    return true;
  }

  dispose(): void {
    this.mesh.traverse((o) => {
      const meshObj = o as THREE.Mesh;
      if (meshObj.isMesh) {
        meshObj.geometry?.dispose();
        const mat = meshObj.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      }
    });
  }
}
