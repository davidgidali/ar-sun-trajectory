'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { DeviceOrientation } from '@/lib/orientation';
import { setObjectQuaternion, getScreenOrientation } from '@/lib/orientation';
import type { SunTrajectory } from '@/lib/sunTrajectory';
import { sunPositionTo3D } from '@/lib/sunTrajectory';

interface ARSceneProps {
  orientation: DeviceOrientation | null;
  trajectory: SunTrajectory | null;
  width: number;
  height: number;
}

export default function ARScene({ orientation, trajectory, width, height }: ARSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const arcLineRef = useRef<THREE.Line | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const currentIndicatorRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = null; // Ensure transparent background
    sceneRef.current = scene;

    // Camera with wide FOV to match device camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setClearColor(0x000000, 0); // Black, fully transparent background
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Create sun trajectory arc
    const createArc = (trajectory: SunTrajectory) => {
      // Remove old arc if exists
      if (arcLineRef.current) {
        scene.remove(arcLineRef.current);
      }
      if (markersRef.current) {
        scene.remove(markersRef.current);
      }
      if (currentIndicatorRef.current) {
        scene.remove(currentIndicatorRef.current);
      }

      // Create points for the arc
      const points: THREE.Vector3[] = [];
      const markerGroup = new THREE.Group();
      markersRef.current = markerGroup;

      trajectory.positions.forEach((position, index) => {
        const pos3D = sunPositionTo3D(position);
        const point = new THREE.Vector3(pos3D.x * 10, pos3D.y * 10, pos3D.z * 10); // Scale for visibility
        points.push(point);

        // Add hourly marker (sphere)
        if (index > 0 && index < trajectory.positions.length - 1) {
          const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
          const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
          const marker = new THREE.Mesh(markerGeometry, markerMaterial);
          marker.position.copy(point);
          markerGroup.add(marker);
        }
      });

      // Create line for the arc
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffaa00,
        linewidth: 3,
      });
      const arcLine = new THREE.Line(geometry, material);
      arcLineRef.current = arcLine;
      scene.add(arcLine);
      scene.add(markerGroup);

      // Add current sun position indicator
      if (trajectory.currentPosition) {
        const currentPos3D = sunPositionTo3D(trajectory.currentPosition);
        const currentPoint = new THREE.Vector3(
          currentPos3D.x * 10,
          currentPos3D.y * 10,
          currentPos3D.z * 10
        );

        const indicatorGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.copy(currentPoint);
        currentIndicatorRef.current = indicator;
        scene.add(indicator);
      }
    };

    // Initial render
    if (trajectory) {
      createArc(trajectory);
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

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
      if (renderer) {
        renderer.dispose();
      }
      if (arcLineRef.current) {
        arcLineRef.current.geometry.dispose();
        (arcLineRef.current.material as THREE.Material).dispose();
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
    };
  }, [width, height, trajectory]);

  // Update camera rotation when orientation changes
  useEffect(() => {
    if (!cameraRef.current || !orientation) return;

    // Convert degrees to radians
    const alpha = orientation.alpha !== null ? (orientation.alpha * Math.PI) / 180 : 0;
    const beta = orientation.beta !== null ? (orientation.beta * Math.PI) / 180 : 0;
    const gamma = orientation.gamma !== null ? (orientation.gamma * Math.PI) / 180 : 0;
    const orient = (getScreenOrientation() * Math.PI) / 180;

    // Use quaternion-based rotation (official Three.js pattern)
    setObjectQuaternion(cameraRef.current.quaternion, alpha, beta, gamma, orient, THREE);
  }, [orientation]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10, background: 'transparent' }}
    />
  );
}

