'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { DeviceOrientation } from '@/lib/orientation';
import { setObjectQuaternion } from '@/lib/orientation';
import type { SunTrajectory } from '@/lib/sunTrajectory';
import { createARContent } from '@/lib/createARContent';
import ARCamera from '@/components/ARCamera';

interface ARCameraViewProps {
  orientation: DeviceOrientation | null;
  trajectory: SunTrajectory | null;
  width: number;
  height: number;
  fov?: number;
}

export default function ARCameraView({ orientation, trajectory, width, height, fov }: ARCameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const aboveHorizonArcRef = useRef<THREE.Line | null>(null);
  const belowHorizonArcRef = useRef<THREE.Line | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const currentIndicatorRef = useRef<THREE.Mesh | null>(null);
  const horizonPlaneRef = useRef<THREE.Mesh | null>(null);
  const compassRef = useRef<THREE.Group | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to show camera feed
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(fov ?? 75, width / height, 0.1, 1000);
    camera.position.set(0, 1.78, 0); // Human eye level: 5'10" ≈ 1.78 meters above ground
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true, // Enable transparency
      antialias: true,
    });
    renderer.setClearColor(0x000000, 0); // Transparent clear color
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    if (trajectory) {
      const { aboveHorizonArc, belowHorizonArc, markers, currentIndicator, horizonPlane, compass } = createARContent(scene, trajectory, THREE);
      aboveHorizonArcRef.current = aboveHorizonArc;
      belowHorizonArcRef.current = belowHorizonArc;
      markersRef.current = markers;
      currentIndicatorRef.current = currentIndicator;
      horizonPlaneRef.current = horizonPlane;
      compassRef.current = compass;
    }

    let animationFrameId: number;
    const animate = () => {
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (aboveHorizonArcRef.current) {
        aboveHorizonArcRef.current.geometry.dispose();
        (aboveHorizonArcRef.current.material as THREE.Material).dispose();
        aboveHorizonArcRef.current = null;
      }
      if (belowHorizonArcRef.current) {
        belowHorizonArcRef.current.geometry.dispose();
        (belowHorizonArcRef.current.material as THREE.Material).dispose();
        belowHorizonArcRef.current = null;
      }
      if (markersRef.current) {
        markersRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        markersRef.current = null;
      }
      if (currentIndicatorRef.current) {
        currentIndicatorRef.current.geometry.dispose();
        (currentIndicatorRef.current.material as THREE.Material).dispose();
        currentIndicatorRef.current = null;
      }
      if (horizonPlaneRef.current) {
        horizonPlaneRef.current.geometry.dispose();
        (horizonPlaneRef.current.material as THREE.Material).dispose();
        horizonPlaneRef.current = null;
      }
      if (compassRef.current) {
        compassRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
        compassRef.current = null;
      }
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [height, trajectory, width, fov]);

  useEffect(() => {
    if (!sceneRef.current || !trajectory) return;

    // Cleanup old content
    if (aboveHorizonArcRef.current) {
      sceneRef.current.remove(aboveHorizonArcRef.current);
      aboveHorizonArcRef.current.geometry.dispose();
      (aboveHorizonArcRef.current.material as THREE.Material).dispose();
      aboveHorizonArcRef.current = null;
    }
    if (belowHorizonArcRef.current) {
      sceneRef.current.remove(belowHorizonArcRef.current);
      belowHorizonArcRef.current.geometry.dispose();
      (belowHorizonArcRef.current.material as THREE.Material).dispose();
      belowHorizonArcRef.current = null;
    }
    if (markersRef.current) {
      sceneRef.current.remove(markersRef.current);
      markersRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      markersRef.current = null;
    }
    if (currentIndicatorRef.current) {
      sceneRef.current.remove(currentIndicatorRef.current);
      currentIndicatorRef.current.geometry.dispose();
      (currentIndicatorRef.current.material as THREE.Material).dispose();
      currentIndicatorRef.current = null;
    }
    if (horizonPlaneRef.current) {
      sceneRef.current.remove(horizonPlaneRef.current);
      horizonPlaneRef.current.geometry.dispose();
      (horizonPlaneRef.current.material as THREE.Material).dispose();
      horizonPlaneRef.current = null;
    }
    if (compassRef.current) {
      sceneRef.current.remove(compassRef.current);
      compassRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      compassRef.current = null;
    }

    const { aboveHorizonArc, belowHorizonArc, markers, currentIndicator, horizonPlane, compass } = createARContent(
      sceneRef.current,
      trajectory,
      THREE
    );
    aboveHorizonArcRef.current = aboveHorizonArc;
    belowHorizonArcRef.current = belowHorizonArc;
    markersRef.current = markers;
    currentIndicatorRef.current = currentIndicator;
    horizonPlaneRef.current = horizonPlane;
    compassRef.current = compass;
  }, [trajectory]);

  useEffect(() => {
    if (!cameraRef.current || !orientation) return;
    const alpha = ((orientation.alpha ?? 0) * Math.PI) / 180;
    const beta = ((orientation.beta ?? 0) * Math.PI) / 180;
    const gamma = ((orientation.gamma ?? 0) * Math.PI) / 180;
    setObjectQuaternion(cameraRef.current.quaternion, alpha, beta, gamma, 0, THREE);
  }, [orientation]);

  useEffect(() => {
    const isVisible = showOverlay;
    if (aboveHorizonArcRef.current) aboveHorizonArcRef.current.visible = isVisible;
    if (belowHorizonArcRef.current) belowHorizonArcRef.current.visible = isVisible;
    if (markersRef.current) markersRef.current.visible = isVisible;
    if (currentIndicatorRef.current) currentIndicatorRef.current.visible = isVisible;
    if (horizonPlaneRef.current) horizonPlaneRef.current.visible = isVisible;
    if (compassRef.current) compassRef.current.visible = isVisible;
  }, [showOverlay]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/60 p-4 text-white">
      <div className="flex items-center justify-between text-sm font-semibold text-white/80">
        <span>AR Camera View</span>
        <button
          type="button"
          className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
          onClick={() => setShowOverlay((prev) => !prev)}
        >
          {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
        </button>
      </div>
      <div className="relative w-full rounded-md border border-white/5 overflow-hidden bg-black" style={{ height: `${height}px`, maxHeight: '100%', position: 'relative' }}>
        <ARCamera />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: 'block', zIndex: 10, background: 'transparent' }}
        />
      </div>
    </div>
  );
}


