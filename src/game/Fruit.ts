import * as THREE from "three";
import type { FruitKind, ScreenHitbox } from "./types";

/**
 * Procedural placeholder geometry for fruit. Phase 2 ships without an
 * asset pipeline; swap these factories out for GLTF loads in a later phase
 * if/when real models are sourced.
 */
function buildApple(): THREE.Object3D {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    new THREE.MeshStandardMaterial({
      color: 0xc8201f,
      roughness: 0.45,
      metalness: 0.05,
    }),
  );
  // Slight vertical squash for an apple silhouette.
  body.scale.set(1, 0.92, 1);
  group.add(body);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.9 }),
  );
  stem.position.y = 1.0;
  stem.rotation.z = 0.15;
  group.add(stem);

  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x3aaa3a, roughness: 0.6 }),
  );
  leaf.scale.set(1.4, 0.3, 0.6);
  leaf.position.set(0.18, 1.04, 0);
  leaf.rotation.z = -0.4;
  group.add(leaf);
  return group;
}

function buildOrange(): THREE.Object3D {
  const group = new THREE.Group();
  const geom = new THREE.SphereGeometry(1, 40, 28);
  // Bumpy surface via vertex displacement.
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 12) * Math.cos(y * 12) * Math.sin(z * 12);
    const f = 1 + n * 0.02;
    pos.setXYZ(i, x * f, y * f, z * f);
  }
  geom.computeVertexNormals();
  const body = new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({
      color: 0xf08a1a,
      roughness: 0.75,
      metalness: 0.0,
    }),
  );
  group.add(body);

  const nub = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a6a26, roughness: 0.8 }),
  );
  nub.position.y = 1.0;
  group.add(nub);
  return group;
}

function buildWatermelon(): THREE.Object3D {
  const group = new THREE.Group();
  const geom = new THREE.SphereGeometry(1, 48, 32);
  // Stripes via vertex colors based on longitude.
  const colors: number[] = [];
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const dark = new THREE.Color(0x12491f);
  const light = new THREE.Color(0x4ea64b);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const lon = Math.atan2(z, x);
    const stripe = Math.sin(lon * 7) * 0.5 + 0.5; // 0..1
    const t = stripe > 0.65 ? 0 : 1;
    c.copy(t === 0 ? dark : light);
    colors.push(c.r, c.g, c.b);
  }
  geom.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  const body = new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.55,
      metalness: 0.0,
    }),
  );
  body.scale.set(1.05, 0.85, 1.05);
  group.add(body);
  return group;
}

const BUILDERS: Record<FruitKind, () => THREE.Object3D> = {
  apple: buildApple,
  orange: buildOrange,
  watermelon: buildWatermelon,
};

/** Public factory — used by Shard to spawn halves that match the original fruit. */
export function buildFruitMesh(kind: FruitKind): THREE.Object3D {
  return BUILDERS[kind]();
}

export class Fruit {
  readonly kind: FruitKind;
  readonly mesh: THREE.Object3D;
  readonly radius: number;
  readonly velocity: THREE.Vector3;
  readonly angularVelocity: THREE.Vector3;
  alive = true;
  /** Increasing age in seconds. */
  age = 0;

  constructor(params: {
    kind: FruitKind;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    radius: number;
  }) {
    this.kind = params.kind;
    this.radius = params.radius;
    this.velocity = params.velocity.clone();
    this.angularVelocity = params.angularVelocity.clone();
    this.mesh = BUILDERS[params.kind]();
    this.mesh.position.copy(params.position);
    this.mesh.scale.multiplyScalar(params.radius);
  }

  update(dt: number, gravity: number): void {
    this.age += dt;
    this.velocity.y -= gravity * dt;
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;
    this.mesh.rotation.x += this.angularVelocity.x * dt;
    this.mesh.rotation.y += this.angularVelocity.y * dt;
    this.mesh.rotation.z += this.angularVelocity.z * dt;
  }

  /** Project the fruit's bounding sphere into pixel-space for hit testing. */
  screenHitbox(
    camera: THREE.Camera,
    viewportW: number,
    viewportH: number,
    _scratch?: { a: THREE.Vector3; b: THREE.Vector3 },
  ): ScreenHitbox {
    const scratch = _scratch ?? {
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
    };
    scratch.a.copy(this.mesh.position).project(camera);
    // Offset by camera-up * radius (in world space) to estimate pixel radius.
    const up = new THREE.Vector3();
    camera.matrixWorld.extractBasis(new THREE.Vector3(), up, new THREE.Vector3());
    scratch.b.copy(this.mesh.position).addScaledVector(up, this.radius).project(camera);

    const cx = (scratch.a.x * 0.5 + 0.5) * viewportW;
    const cy = (1 - (scratch.a.y * 0.5 + 0.5)) * viewportH;
    const px = (scratch.b.x * 0.5 + 0.5) * viewportW;
    const py = (1 - (scratch.b.y * 0.5 + 0.5)) * viewportH;
    const r = Math.hypot(px - cx, py - cy);
    return { cx, cy, r };
  }

  dispose(): void {
    this.mesh.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      }
    });
  }
}
