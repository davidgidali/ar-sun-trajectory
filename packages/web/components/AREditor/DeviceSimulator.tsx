'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { DeviceOrientation } from '@/lib/orientation';
import { setObjectQuaternion } from '@/lib/orientation';
import { applyOrientationDelta, getOrientationDeltaForKey } from '@/lib/editorControls';

interface DeviceSimulatorProps {
  onOrientationChange?: (orientation: DeviceOrientation) => void;
  initialOrientation?: DeviceOrientation;
}

const defaultOrientation: DeviceOrientation = {
  alpha: 180,
  beta: 90,
  gamma: 0,
  absolute: false,
};

export default function DeviceSimulator({
  onOrientationChange,
  initialOrientation,
}: DeviceSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const deviceMeshRef = useRef<THREE.Mesh | null>(null);
  const [orientation, setOrientation] = useState<DeviceOrientation>(
    initialOrientation ?? defaultOrientation
  );

  const orientationDisplay = useMemo(
    () => ({
      alpha: (orientation.alpha ?? 0).toFixed(1),
      beta: (orientation.beta ?? 0).toFixed(1),
      gamma: (orientation.gamma ?? 0).toFixed(1),
    }),
    [orientation]
  );

  useEffect(() => {
    onOrientationChange?.(orientation);
  }, [orientation, onOrientationChange]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(6, 4, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    const initialWidth = canvasRef.current.clientWidth || 320;
    const initialHeight = canvasRef.current.clientHeight || initialWidth * 0.75;
    renderer.setSize(initialWidth, initialHeight);
    camera.aspect = initialWidth / initialHeight;
    camera.updateProjectionMatrix();
    rendererRef.current = renderer;

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7.5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const deviceGeometry = new THREE.BoxGeometry(2, 4, 0.2);
    const deviceMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      metalness: 0.3,
      roughness: 0.6,
    });
    const deviceMesh = new THREE.Mesh(deviceGeometry, deviceMaterial);
    deviceMeshRef.current = deviceMesh;
    scene.add(deviceMesh);

    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    let animationFrameId: number;
    const animate = () => {
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.clientWidth || 320;
      const height = canvasRef.current.clientHeight || width * 0.75;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      deviceGeometry.dispose();
      deviceMaterial.dispose();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      deviceMeshRef.current = null;
    };
  }, []);

  // Apply orientation updates to device mesh
  useEffect(() => {
    if (!deviceMeshRef.current) return;

    const alpha = ((orientation.alpha ?? 0) * Math.PI) / 180;
    const beta = ((orientation.beta ?? 0) * Math.PI) / 180;
    const gamma = ((orientation.gamma ?? 0) * Math.PI) / 180;

    setObjectQuaternion(deviceMeshRef.current.quaternion, alpha, beta, gamma, 0, THREE);
  }, [orientation]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const delta = getOrientationDeltaForKey(event.code);
      if (!delta) return;
      event.preventDefault();
      setOrientation((prev) => applyOrientationDelta(prev, delta));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/60 p-4 text-white">
      <div className="text-sm font-semibold text-white/80">Device Simulator</div>
      <canvas ref={canvasRef} className="h-48 w-full rounded-md border border-white/5 bg-black" />
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-300">
        <div>
          <p className="uppercase text-[10px] tracking-wide text-white/50">Yaw</p>
          <p className="font-mono text-sm">{orientationDisplay.alpha}°</p>
        </div>
        <div>
          <p className="uppercase text-[10px] tracking-wide text-white/50">Pitch</p>
          <p className="font-mono text-sm">{orientationDisplay.beta}°</p>
        </div>
        <div>
          <p className="uppercase text-[10px] tracking-wide text-white/50">Roll</p>
          <p className="font-mono text-sm">{orientationDisplay.gamma}°</p>
        </div>
      </div>
      <div className="rounded-md bg-white/5 p-3 text-[11px] text-gray-300">
        <p className="mb-1 font-semibold text-white/80">Controls</p>
        <ul className="space-y-1">
          <li>W/S: Pitch up/down</li>
          <li>A/D: Yaw left/right</li>
          <li>Q/E: Roll left/right</li>
          <li>Arrows: Fine adjustments</li>
          <li>Space: Reset orientation (camera facing North)</li>
        </ul>
      </div>
    </div>
  );
}


