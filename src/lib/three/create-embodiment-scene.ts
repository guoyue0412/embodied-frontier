import * as THREE from "three";
import { createEmbodimentRenderLoop } from "../embodiment-runtime.mjs";

export interface EmbodimentScene {
  setPointer(x: number, y: number): void;
  setVisible(value: boolean): void;
  resize(): void;
  dispose(): void;
}

export interface EmbodimentSceneOptions {
  onError?: (error: unknown) => void;
}

type DisposableMaterial = THREE.Material | THREE.Material[];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Create the small, first-party embodiment study used by the hero.
 *
 * The scene deliberately has no asset or texture request: its figure is made
 * from a small, inspectable set of primitives so the static fallback remains
 * the canonical experience on devices that cannot use WebGL.
 */
export function createEmbodimentScene(canvas: HTMLCanvasElement, options: EmbodimentSceneOptions = {}): EmbodimentScene {
  if (!canvas) throw new Error("Embodiment scene requires a canvas");

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
  camera.position.set(0, 0.18, 7);
  camera.lookAt(0, 0.1, 0);

  // Exactly two lights keep the silhouette legible without an environment map.
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(-3, 4, 5);
  keyLight.name = "white-key-light";
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x48dff6, 5, 8, 2);
  rimLight.position.set(2.8, 1.7, -2.2);
  rimLight.name = "cyan-rim-light";
  scene.add(rimLight);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const figure = new THREE.Group();
  figure.name = "procedural-embodiment";
  scene.add(figure);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x163b58,
    metalness: 0.64,
    roughness: 0.3,
  });
  const limbMaterial = new THREE.MeshStandardMaterial({
    color: 0x265a78,
    metalness: 0.58,
    roughness: 0.34,
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0x7beeff,
    emissive: 0x2bcde8,
    emissiveIntensity: 2.4,
    metalness: 0.25,
    roughness: 0.2,
  });
  materials.push(bodyMaterial, limbMaterial, jointMaterial);

  const capsuleTorso = new THREE.CapsuleGeometry(0.38, 0.78, 6, 18);
  geometries.push(capsuleTorso);
  const torso = new THREE.Mesh(capsuleTorso, bodyMaterial);
  torso.position.set(0, 0.46, 0);
  torso.name = "capsule-torso";
  figure.add(torso);

  const headGeometry = new THREE.SphereGeometry(0.31, 20, 14);
  geometries.push(headGeometry);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.set(0, 1.62, 0);
  head.name = "sphere-head";
  figure.add(head);

  const vector = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const makeCylinder = (name: string, start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) => {
    const axis = new THREE.Vector3().subVectors(end, start);
    const geometry = new THREE.CylinderGeometry(radius, radius, axis.length(), 12, 1);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    figure.add(mesh);
    return mesh;
  };

  // Paired upper/lower arms.
  const shoulders = [
    { side: "left", shoulder: vector(-0.43, 1.02, 0), elbow: vector(-0.78, 0.58, 0.03), wrist: vector(-0.92, 0.12, 0.04) },
    { side: "right", shoulder: vector(0.43, 1.02, 0), elbow: vector(0.78, 0.58, 0.03), wrist: vector(0.92, 0.12, 0.04) },
  ];
  const hips = [
    { side: "left", hip: vector(-0.22, -0.26, 0), knee: vector(-0.27, -0.98, 0.02), ankle: vector(-0.3, -1.66, 0.04) },
    { side: "right", hip: vector(0.22, -0.26, 0), knee: vector(0.27, -0.98, 0.02), ankle: vector(0.3, -1.66, 0.04) },
  ];
  const jointPoints: THREE.Vector3[] = [];
  for (const arm of shoulders) {
    makeCylinder(`${arm.side}-upper-arm`, arm.shoulder, arm.elbow, 0.115, limbMaterial);
    makeCylinder(`${arm.side}-lower-arm`, arm.elbow, arm.wrist, 0.095, limbMaterial);
    jointPoints.push(arm.shoulder, arm.elbow, arm.wrist);
  }
  // Paired upper/lower legs.
  for (const leg of hips) {
    makeCylinder(`${leg.side}-upper-leg`, leg.hip, leg.knee, 0.15, limbMaterial);
    makeCylinder(`${leg.side}-lower-leg`, leg.knee, leg.ankle, 0.12, limbMaterial);
    jointPoints.push(leg.hip, leg.knee, leg.ankle);
  }

  const jointGeometry = new THREE.SphereGeometry(0.075, 12, 8);
  geometries.push(jointGeometry);
  jointPoints.forEach((point, index) => {
    const joint = new THREE.Mesh(jointGeometry, jointMaterial);
    joint.position.copy(point);
    joint.name = `emissive-joint-${index + 1}`;
    figure.add(joint);
  });

  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerCurrent = new THREE.Vector2(0, 0);
  let visible = false;
  let disposed = false;
  let contextLost = false;
  let previousTime = 0;
  let renderLoop: ReturnType<typeof createEmbodimentRenderLoop> | null = null;

  const shouldRender = () => !disposed && !contextLost && visible;
  const reportError = (error: unknown) => {
    if (disposed || contextLost) return;
    contextLost = true;
    renderLoop?.stop();
    try {
      options.onError?.(error);
    } catch {
      // The host callback is optional enhancement plumbing and must not escape
      // into the page if unmount and failure happen in the same turn.
    }
  };
  const drawFrame = (timestamp: number) => {
    const delta = previousTime === 0 ? 0.016 : Math.min(0.05, Math.max(0.001, (timestamp - previousTime) / 1000));
    previousTime = timestamp;
    const follow = 1 - Math.pow(0.0008, delta);
    pointerCurrent.lerp(pointerTarget, follow);
    const idleDrift = visible ? Math.sin(timestamp * 0.00042) * 0.018 : 0;
    figure.rotation.y = pointerCurrent.x * 0.27 + idleDrift;
    figure.rotation.x = pointerCurrent.y * 0.12;
    jointMaterial.emissiveIntensity = 2.15 + Math.sin(timestamp * 0.003) * 0.3;
    renderer.render(scene, camera);
  };
  renderLoop = createEmbodimentRenderLoop({
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
    shouldRender,
    onFrame: drawFrame,
    onError: reportError,
  });

  const onContextLost = (event: Event) => {
    event.preventDefault();
    reportError(new Error("WebGL context lost"));
  };
  canvas.addEventListener("webglcontextlost", onContextLost, false);

  const resize = () => {
    if (disposed || contextLost) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(canvas.clientWidth || rect.width || 1));
    const height = Math.max(1, Math.round(canvas.clientHeight || rect.height || 1));
    const aspect = width / height;
    const verticalSpan = 4.35;
    camera.left = (-verticalSpan * aspect) / 2;
    camera.right = (verticalSpan * aspect) / 2;
    camera.top = verticalSpan / 2;
    camera.bottom = -verticalSpan / 2;
    camera.updateProjectionMatrix();
    try {
      renderer.setSize(width, height, false);
      renderLoop?.schedule();
    } catch (error) {
      reportError(error);
    }
  };
  resize();

  const disposeMaterial = (material: DisposableMaterial) => {
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
  };

  return {
    setPointer(x: number, y: number) {
      if (disposed) return;
      pointerTarget.set(clamp(x, -1, 1), clamp(y, -1, 1));
      if (visible) renderLoop?.schedule();
    },
    setVisible(value: boolean) {
      if (disposed || contextLost) return;
      visible = value;
      if (visible) previousTime = 0;
      if (!visible) {
        // Visibility is a hard lifecycle boundary: hidden tabs and offscreen
        // islands must not keep a RAF alive while the page is unavailable.
        renderLoop?.stop();
        return;
      }
      renderLoop?.schedule();
    },
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      visible = false;
      renderLoop?.dispose();
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => disposeMaterial(material));
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
