'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { DeviceOrientation } from '@/lib/orientation';
import { setObjectQuaternion, getScreenOrientation } from '@/lib/orientation';
import type { SunTrajectory } from '@/lib/sunTrajectory';
import { createARContent } from '@/lib/createARContent';

interface ARSceneProps {
  orientation: DeviceOrientation | null;
  trajectory: SunTrajectory | null;
  width: number;
  height: number;
  fov?: number;
}

export default function ARScene({ orientation, trajectory, width, height, fov }: ARSceneProps) {
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

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = null; // Ensure transparent background
    sceneRef.current = scene;

    // Camera with FOV to match device camera
    const camera = new THREE.PerspectiveCamera(fov ?? 75, width / height, 0.1, 1000);
    camera.position.set(0, 1.78, 0); // Human eye level: 5'10" ≈ 1.78 meters above ground
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false, // Ensure proper alpha blending
    });
    renderer.setClearColor(0x000000, 0); // Black, fully transparent background
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Ensure canvas element itself has transparent background
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = 'transparent';
    }
    rendererRef.current = renderer;

    const buildContent = (traj: SunTrajectory) => {
      if (aboveHorizonArcRef.current) {
        scene.remove(aboveHorizonArcRef.current);
      }
      if (belowHorizonArcRef.current) {
        scene.remove(belowHorizonArcRef.current);
      }
      if (markersRef.current) {
        scene.remove(markersRef.current);
      }
      if (currentIndicatorRef.current) {
        scene.remove(currentIndicatorRef.current);
      }
      if (horizonPlaneRef.current) {
        scene.remove(horizonPlaneRef.current);
      }
      if (compassRef.current) {
        scene.remove(compassRef.current);
        compassRef.current.traverse((child) => {
          if (child instanceof THREE.Sprite && child.material) {
            child.material.dispose();
          }
        });
      }

      const { aboveHorizonArc, belowHorizonArc, markers, currentIndicator, horizonPlane, compass } = createARContent(scene, traj, THREE);
      aboveHorizonArcRef.current = aboveHorizonArc;
      belowHorizonArcRef.current = belowHorizonArc;
      markersRef.current = markers;
      currentIndicatorRef.current = currentIndicator;
      horizonPlaneRef.current = horizonPlane;
      compassRef.current = compass;
    };

    if (trajectory) {
      buildContent(trajectory);
    }

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Update camera rotation based on device orientation using quaternions
      if (orientation && camera) {
        // Convert degrees to radians
        const alpha = orientation.alpha !== null ? (orientation.alpha * Math.PI) / 180 : 0;
        const beta = orientation.beta !== null ? (orientation.beta * Math.PI) / 180 : 0;
        const gamma = orientation.gamma !== null ? (orientation.gamma * Math.PI) / 180 : 0;
        const orient = (getScreenOrientation() * Math.PI) / 180;

        // Use quaternion-based rotation (official Three.js pattern)
        setObjectQuaternion(camera.quaternion, alpha, beta, gamma, orient, THREE);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (renderer) {
        renderer.dispose();
      }
      if (aboveHorizonArcRef.current) {
        aboveHorizonArcRef.current.geometry.dispose();
        (aboveHorizonArcRef.current.material as THREE.Material).dispose();
      }
      if (belowHorizonArcRef.current) {
        belowHorizonArcRef.current.geometry.dispose();
        (belowHorizonArcRef.current.material as THREE.Material).dispose();
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
      }
      if (currentIndicatorRef.current) {
        currentIndicatorRef.current.geometry.dispose();
        (currentIndicatorRef.current.material as THREE.Material).dispose();
      }
      if (horizonPlaneRef.current) {
        horizonPlaneRef.current.geometry.dispose();
        (horizonPlaneRef.current.material as THREE.Material).dispose();
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
      }
    };
  }, [width, height, trajectory, orientation]);

  // Update camera FOV when it changes (without re-initializing scene)
  useEffect(() => {
    if (!cameraRef.current) return;
    const effectiveFOV = fov ?? 75;
    if (cameraRef.current.fov !== effectiveFOV) {
      cameraRef.current.fov = effectiveFOV;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [fov]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ 
        zIndex: 10, 
        background: 'transparent',
        backgroundColor: 'transparent',
      }}
    />
  );
}

