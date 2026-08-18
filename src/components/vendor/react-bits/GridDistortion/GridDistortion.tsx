import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { bindScopedInteraction, createAnimationLifecycle, createFailureGate } from '../../../../lib/hero-visual-runtime.mjs';
import './GridDistortion.css';

interface GridDistortionProps {
  grid?: number;
  mouse?: number;
  strength?: number;
  relaxation?: number;
  imageSrc: string;
  className?: string;
}

const vertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec4 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 offset = texture2D(uDataTexture, vUv);
  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);
}
`;

const GridDistortion: React.FC<GridDistortionProps> = ({
  grid = 15,
  mouse = 0.1,
  strength = 0.15,
  relaxation = 0.9,
  imageSrc,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lifecycleRef = useRef<ReturnType<typeof createAnimationLifecycle> | null>(null);
  const [failed, setFailed] = useState(false);
  const [runtimeState, setRuntimeState] = useState<'initializing' | 'ready' | 'fallback'>('initializing');

  useEffect(() => {
    if (!containerRef.current || failed) return;

    const container = containerRef.current;
    setRuntimeState('initializing');
    let cleanedUp = false;
    let scene: THREE.Scene | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let geometry: THREE.PlaneGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let plane: THREE.Mesh | null = null;
    let dataTexture: THREE.DataTexture | null = null;
    let loadedTexture: THREE.Texture | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let fallbackResize: (() => void) | null = null;
    let observer: IntersectionObserver | null = null;
    let lifecycle: ReturnType<typeof createAnimationLifecycle> | null = null;
    let removeRuntimeListeners: (() => void) | null = null;
    let removeInteraction = () => {};

    const failure = createFailureGate((error) => {
      if (cleanedUp) return;
      console.warn('[GridDistortion] enhancement disabled; static hero remains active.', error);
      lifecycle?.stop();
      setRuntimeState('fallback');
      setFailed(true);
    });

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      if (fallbackResize) window.removeEventListener('resize', fallbackResize);
      removeRuntimeListeners?.();
      removeRuntimeListeners = null;
      lifecycle?.dispose();
      if (renderer) {
        renderer.dispose();
        try {
          renderer.forceContextLoss();
        } catch {
          // Context loss is best-effort during teardown.
        }
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      }
      geometry?.dispose();
      material?.dispose();
      dataTexture?.dispose();
      loadedTexture?.dispose();
      lifecycleRef.current = null;
    };

    const handleResize = () => {
      try {
        if (!container || !renderer || !camera || !plane || !dataTexture) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        if (width === 0 || height === 0) return;

        const containerAspect = width / height;
        renderer.setSize(width, height);
        plane.scale.set(containerAspect, 1, 1);

        const frustumHeight = 1;
        const frustumWidth = frustumHeight * containerAspect;
        camera.left = -frustumWidth / 2;
        camera.right = frustumWidth / 2;
        camera.top = frustumHeight / 2;
        camera.bottom = -frustumHeight / 2;
        camera.updateProjectionMatrix();
        dataTexture.needsUpdate = true;
      } catch (error) {
        failure.fail(error);
      }
    };

    try {
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.replaceChildren(renderer.domElement);

      camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
      camera.position.z = 2;

      const uniforms = {
        time: { value: 0 },
        resolution: { value: new THREE.Vector4() },
        uTexture: { value: null as THREE.Texture | null },
        uDataTexture: { value: null as THREE.DataTexture | null }
      };

      const size = grid;
      const data = new Float32Array(4 * size * size);
      for (let i = 0; i < size * size; i++) {
        data[i * 4] = Math.random() * 255 - 125;
        data[i * 4 + 1] = Math.random() * 255 - 125;
      }

      dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
      dataTexture.needsUpdate = true;
      uniforms.uDataTexture.value = dataTexture;

      material = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true
      });

      geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1);
      plane = new THREE.Mesh(geometry, material);
      scene.add(plane);

      const mouseState = {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vX: 0,
        vY: 0
      };

      const animate = () => {
        if (cleanedUp || !renderer || !scene || !camera || !dataTexture) return;
        if (!(dataTexture.image.data instanceof Float32Array)) {
          failure.fail(new Error('GridDistortion data texture is unavailable.'));
          return;
        }

        try {
          uniforms.time.value += 0.05;
          const textureData = dataTexture.image.data;
          for (let i = 0; i < size * size; i++) {
            textureData[i * 4] *= relaxation;
            textureData[i * 4 + 1] *= relaxation;
          }

          const gridMouseX = size * mouseState.x;
          const gridMouseY = size * mouseState.y;
          const maxDist = size * mouse;
          for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
              const distSq = Math.pow(gridMouseX - i, 2) + Math.pow(gridMouseY - j, 2);
              if (distSq < maxDist * maxDist) {
                const index = 4 * (i + size * j);
                const power = Math.min(maxDist / Math.sqrt(distSq), 10);
                textureData[index] += strength * 100 * mouseState.vX * power;
                textureData[index + 1] -= strength * 100 * mouseState.vY * power;
              }
            }
          }

          dataTexture.needsUpdate = true;
          renderer.render(scene, camera);
        } catch (error) {
          failure.fail(error);
        }
      };

      lifecycle = createAnimationLifecycle({
        requestFrame: (callback) => window.requestAnimationFrame(callback),
        cancelFrame: (id) => window.cancelAnimationFrame(id),
        onFrame: animate
      });
      lifecycleRef.current = lifecycle;

      const observedElement = container;
      observer = 'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => lifecycle?.setIntersecting(entry?.isIntersecting === true), { threshold: 0 })
        : null;
      if (observer) observer.observe(observedElement);
      else lifecycle.setIntersecting(true);

      const handleVisibility = () => lifecycle?.setDocumentVisible(document.visibilityState !== 'hidden');
      document.addEventListener('visibilitychange', handleVisibility);
      removeRuntimeListeners = () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        removeInteraction();
      };
      lifecycle.setDocumentVisible(document.visibilityState !== 'hidden');

      resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(handleResize) : null;
      if (resizeObserver) resizeObserver.observe(container);
      else {
        fallbackResize = handleResize;
        window.addEventListener('resize', fallbackResize);
      }

      const handleMouseMove = (event: Event) => {
        const e = event as MouseEvent;
        if (!lifecycle?.active) return;
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - (e.clientY - rect.top) / rect.height;
        mouseState.vX = x - mouseState.prevX;
        mouseState.vY = y - mouseState.prevY;
        Object.assign(mouseState, { x, y, prevX: x, prevY: y });
      };

      const handleMouseLeave = () => {
        Object.assign(mouseState, {
          x: 0,
          y: 0,
          prevX: 0,
          prevY: 0,
          vX: 0,
          vY: 0
        });
      };

      removeInteraction = bindScopedInteraction(container, [
        { type: 'mousemove', listener: handleMouseMove, options: { passive: true } },
        { type: 'mouseleave', listener: handleMouseLeave }
      ]);

      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        imageSrc,
        (texture: THREE.Texture) => {
          if (cleanedUp || failure.failed) {
            texture.dispose();
            return;
          }
          if (!texture.image?.width || !texture.image?.height) {
            texture.dispose();
            failure.fail(new Error('GridDistortion texture has no usable dimensions.'));
            return;
          }
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          loadedTexture = texture;
          uniforms.uTexture.value = texture;
          handleResize();
          if (!failure.failed) {
            setRuntimeState('ready');
            lifecycle?.start();
          }
        },
        undefined,
        (error) => failure.fail(error)
      );

      return () => {
        cleanup();
      };
    } catch (error) {
      failure.fail(error);
      return cleanup;
    }
  }, [grid, mouse, strength, relaxation, imageSrc, failed]);

  return (
    <div
      ref={containerRef}
      className={`distortion-container ${className}`}
      data-visual-failed={failed ? 'true' : 'false'}
      data-visual-state={runtimeState}
      style={{
        width: '100%',
        height: '100%',
        minWidth: '0',
        minHeight: '0'
      }}
    />
  );
};

export default GridDistortion;
