'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { DeviceOrientation } from '@/lib/orientation';
import { setObjectQuaternion } from '@/lib/orientation';

interface DeviceFOVIndicatorProps {
  orientation: DeviceOrientation | null;
  fov?: number;
  aspect?: number;
}

export default function DeviceFOVIndicator({
  orientation,
  fov = 75,
  aspect = 9 / 16,
}: DeviceFOVIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const viewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const deviceCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const helperRef = useRef<THREE.CameraHelper | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030305);
    sceneRef.current = scene;

    const displayCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    displayCamera.position.set(8, 5, 8);
    displayCamera.lookAt(0, 0, 0);
    viewCameraRef.current = displayCamera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    const initialWidth = canvasRef.current.clientWidth || 320;
    const initialHeight = canvasRef.current.clientHeight || initialWidth * 0.75;
    renderer.setSize(initialWidth, initialHeight);
    displayCamera.aspect = initialWidth / initialHeight;
    displayCamera.updateProjectionMatrix();
    rendererRef.current = renderer;

    const deviceCamera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 50);
    deviceCamera.position.set(0, 1.5, 0);
    deviceCamera.lookAt(0, 1.5, -1);
    deviceCameraRef.current = deviceCamera;

    const helper = new THREE.CameraHelper(deviceCamera);
    helperRef.current = helper;
    scene.add(helper);

    const grid = new THREE.GridHelper(30, 30, 0x333333, 0x111111);
    scene.add(grid);
    const axes = new THREE.AxesHelper(2);
    scene.add(axes);

    const deviceGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.05);
    const deviceMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const deviceBody = new THREE.Mesh(deviceGeometry, deviceMaterial);
    deviceBody.position.copy(deviceCamera.position);
    scene.add(deviceBody);

    let animationFrameId: number;
    const animate = () => {
      renderer.render(scene, displayCamera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current || !viewCameraRef.current) return;
      const width = canvasRef.current.clientWidth || 320;
      const height = canvasRef.current.clientHeight || width * 0.75;
      rendererRef.current.setSize(width, height);
      viewCameraRef.current.aspect = width / height;
      viewCameraRef.current.updateProjectionMatrix();
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
      viewCameraRef.current = null;
      rendererRef.current = null;
      helperRef.current = null;
      deviceCameraRef.current = null;
    };
  }, [aspect, fov]);

  useEffect(() => {
    if (!deviceCameraRef.current) return;
    const alpha = ((orientation?.alpha ?? 0) * Math.PI) / 180;
    const beta = ((orientation?.beta ?? 0) * Math.PI) / 180;
    const gamma = ((orientation?.gamma ?? 0) * Math.PI) / 180;

    setObjectQuaternion(deviceCameraRef.current.quaternion, alpha, beta, gamma, 0, THREE);
    deviceCameraRef.current.updateProjectionMatrix();
    helperRef.current?.update();
  }, [orientation]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/60 p-4 text-white">
      <div className="text-sm font-semibold text-white/80">Camera FOV</div>
      <canvas ref={canvasRef} className="h-48 w-full rounded-md border border-white/5 bg-black" />
      <div className="text-xs text-gray-300">
        <p>FOV: {fov.toFixed(0)}°</p>
        <p>Aspect: {aspect.toFixed(2)} : 1</p>
      </div>
    </div>
  );
}


