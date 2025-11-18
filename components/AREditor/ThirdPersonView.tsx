'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { SunTrajectory } from '@/lib/sunTrajectory';
import { createARContent } from '@/lib/createARContent';
import type { DeviceOrientation } from '@/lib/orientation';
import { setObjectQuaternion } from '@/lib/orientation';
import { getOrientationDeltaForKey } from '@/lib/editorControls';

const DEG2RAD = Math.PI / 180;
const COARSE_STEP = 5 * DEG2RAD;
const FINE_STEP = 1 * DEG2RAD;

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const q1Inverse = q1.clone().invert();

function deviceOrientationToQuaternion(orientation: DeviceOrientation, THREEObj: typeof THREE) {
  const alpha = ((orientation.alpha ?? 0) * DEG2RAD);
  const beta = ((orientation.beta ?? 0) * DEG2RAD);
  const gamma = ((orientation.gamma ?? 0) * DEG2RAD);
  const quat = new THREEObj.Quaternion();
  setObjectQuaternion(quat, alpha, beta, gamma, 0, THREEObj);
  return quat;
}

function quaternionToDeviceOrientation(quaternion: THREE.Quaternion): DeviceOrientation {
  const q = quaternion.clone();
  q.multiply(q1Inverse);
  const euler = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  return {
    alpha: THREE.MathUtils.radToDeg(euler.y),
    beta: THREE.MathUtils.radToDeg(euler.x),
    gamma: -THREE.MathUtils.radToDeg(euler.z),
  };
}

interface ThirdPersonViewProps {
  trajectory: SunTrajectory | null;
  orientation: DeviceOrientation;
  onOrientationChange?: (orientation: DeviceOrientation) => void;
  width: number;
  height: number;
}

export default function ThirdPersonView({
  trajectory,
  orientation,
  onOrientationChange,
  width,
  height,
}: ThirdPersonViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const aboveHorizonArcRef = useRef<THREE.Line | null>(null);
  const belowHorizonArcRef = useRef<THREE.Line | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const currentIndicatorRef = useRef<THREE.Mesh | null>(null);
  const horizonPlaneRef = useRef<THREE.Mesh | null>(null);
  const compassRef = useRef<THREE.Group | null>(null);
  const deviceGroupRef = useRef<THREE.Group | null>(null);
  const deviceCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const fovHelperRef = useRef<THREE.CameraHelper | null>(null);
  const axisLabelsRef = useRef<THREE.Group | null>(null);
  const axisLabelTexturesRef = useRef<THREE.Texture[]>([]);
  const orientationQuatRef = useRef<THREE.Quaternion>(
    deviceOrientationToQuaternion(orientation, THREE)
  );
  const [sceneReady, setSceneReady] = useState(false);

  const createAxisLabel = (text: string, color: string, position: THREE.Vector3) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = color;
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    axisLabelTexturesRef.current.push(texture);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(1.2, 1.2, 1.2);
    return sprite;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    let cancelled = false;

    const initScene = async () => {
      const { OrbitControls: OrbitControlsClass } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      );

      if (cancelled) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);
      sceneRef.current = scene;

      const safeWidth = Math.max(width, 100);
      const safeHeight = Math.max(height, 100);

      const camera = new THREE.PerspectiveCamera(60, safeWidth / safeHeight, 0.1, 2000);
      camera.position.set(15, 10, 15);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      if (!canvasRef.current) return;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(safeWidth, safeHeight);
      rendererRef.current = renderer;

      const controls = new OrbitControlsClass(camera, canvasRef.current!);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 0, 0);
      controlsRef.current = controls;

      const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
      scene.add(gridHelper);
      const axesHelper = new THREE.AxesHelper(3);
      scene.add(axesHelper);

      const axisLabels = new THREE.Group();
      axisLabelsRef.current = axisLabels;
      const xLabel = createAxisLabel('X', '#ff5c5c', new THREE.Vector3(3.5, 0, 0));
      const yLabel = createAxisLabel('Y', '#5cff8d', new THREE.Vector3(0, 3.5, 0));
      const zLabel = createAxisLabel('Z', '#5cb8ff', new THREE.Vector3(0, 0, 3.5));
      [xLabel, yLabel, zLabel].forEach((label) => {
        if (label) axisLabels.add(label);
      });
      scene.add(axisLabels);

      // Create device group at human eye level (5'10" ≈ 1.78m)
      const deviceGroup = new THREE.Group();
      deviceGroup.position.y = 1.78;
      deviceGroupRef.current = deviceGroup;

      // Device body (phone)
      const deviceBodyGeometry = new THREE.BoxGeometry(1.5, 3, 0.1);
      const deviceBodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1f6aff,
        metalness: 0.35,
        roughness: 0.4,
      });
      const deviceBody = new THREE.Mesh(deviceBodyGeometry, deviceBodyMaterial);
      deviceGroup.add(deviceBody);

      // White screen plane (front face)
      const screenGeometry = new THREE.PlaneGeometry(1.3, 2.2);
      const screenMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const screen = new THREE.Mesh(screenGeometry, screenMaterial);
      screen.position.set(0, 0.2, 0.06);
      deviceGroup.add(screen);

      // Red circle for thumb/home button at bottom
      const thumbGeometry = new THREE.CircleGeometry(0.15, 32);
      const thumbMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
      const thumb = new THREE.Mesh(thumbGeometry, thumbMaterial);
      thumb.position.set(0, -1.35, 0.07);
      deviceGroup.add(thumb);

      const light = new THREE.DirectionalLight(0xffffff, 0.9);
      light.position.set(5, 10, 7.5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));

      scene.add(deviceGroup);

      // Device camera (for FOV visualization) - at scene root, quaternion set directly
      // Positioned at human eye level (5'10" ≈ 1.78m), back of where device would be
      const deviceCamera = new THREE.PerspectiveCamera(75, 9 / 16, 0.1, 50);
      deviceCamera.position.set(0, 1.78, -0.05);
      deviceCameraRef.current = deviceCamera;
      scene.add(deviceCamera); // Add to scene root, not deviceGroup

      // FOV helper - at scene root, reads camera's world matrix
      const fovHelper = new THREE.CameraHelper(deviceCamera);
      fovHelperRef.current = fovHelper;
      scene.add(fovHelper); // Add to scene root, not deviceGroup

      // Apply initial orientation to device group and camera
      const initialQuat = deviceOrientationToQuaternion(orientation, THREE);
      orientationQuatRef.current.copy(initialQuat);
      deviceGroup.quaternion.copy(initialQuat);
      
      const initialAlpha = (orientation.alpha ?? 0) * DEG2RAD;
      const initialBeta = (orientation.beta ?? 0) * DEG2RAD;
      const initialGamma = (orientation.gamma ?? 0) * DEG2RAD;
      setObjectQuaternion(deviceCamera.quaternion, initialAlpha, initialBeta, initialGamma, 0, THREE);
      deviceCamera.updateProjectionMatrix();
      fovHelper.update();

      let animationFrameId: number;
      const animate = () => {
        if (cancelled) return;
        controls.update();
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
      setSceneReady(true);
    };

    initScene();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      const scene = sceneRef.current;
      if (scene) {
        scene.clear();
        sceneRef.current = null;
      }
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      deviceGroupRef.current = null;
      deviceCameraRef.current = null;
      fovHelperRef.current = null;
      if (axisLabelsRef.current && scene) {
        scene.remove(axisLabelsRef.current);
        axisLabelsRef.current = null;
      }
      axisLabelTexturesRef.current.forEach((texture) => texture.dispose());
      axisLabelTexturesRef.current = [];
      setSceneReady(false);
    };
  }, [width, height]);

  // Update device orientation - consolidated single effect
  useEffect(() => {
    if (!deviceGroupRef.current || !deviceCameraRef.current) return;

    const quat = deviceOrientationToQuaternion(orientation, THREE);
    orientationQuatRef.current.copy(quat);
    
    // Update deviceGroup quaternion for body/screen/thumb
    deviceGroupRef.current.quaternion.copy(quat);
    
    // Set deviceCamera quaternion directly (matching ARCameraView approach)
    const alpha = (orientation.alpha ?? 0) * DEG2RAD;
    const beta = (orientation.beta ?? 0) * DEG2RAD;
    const gamma = (orientation.gamma ?? 0) * DEG2RAD;
    setObjectQuaternion(deviceCameraRef.current.quaternion, alpha, beta, gamma, 0, THREE);
    deviceCameraRef.current.updateProjectionMatrix();
    
    fovHelperRef.current?.update();
  }, [orientation, sceneReady]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const delta = getOrientationDeltaForKey(event.code);
      if (!delta) return;
      event.preventDefault();
      const quat = orientationQuatRef.current.clone();
      const applyRotation = (axis: THREE.Vector3, amount: number) => {
        const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, amount);
        quat.multiply(deltaQuat);
      };

      switch (event.code) {
        case 'KeyW':
          applyRotation(AXIS_X, COARSE_STEP);
          break;
        case 'KeyS':
          applyRotation(AXIS_X, -COARSE_STEP);
          break;
        case 'KeyA':
          applyRotation(AXIS_Y, COARSE_STEP);
          break;
        case 'KeyD':
          applyRotation(AXIS_Y, -COARSE_STEP);
          break;
        case 'KeyQ':
          applyRotation(AXIS_Z, COARSE_STEP);
          break;
        case 'KeyE':
          applyRotation(AXIS_Z, -COARSE_STEP);
          break;
        case 'ArrowUp':
          applyRotation(AXIS_X, FINE_STEP);
          break;
        case 'ArrowDown':
          applyRotation(AXIS_X, -FINE_STEP);
          break;
        case 'ArrowLeft':
          applyRotation(AXIS_Y, FINE_STEP);
          break;
        case 'ArrowRight':
          applyRotation(AXIS_Y, -FINE_STEP);
          break;
        case 'Space':
          quat.copy(deviceOrientationToQuaternion({ alpha: 180, beta: 90, gamma: 0 }, THREE));
          break;
        default:
          return;
      }

      quat.normalize();
      orientationQuatRef.current.copy(quat);
      const newOrientation = quaternionToDeviceOrientation(quat);
      
      // Update deviceGroup quaternion for body/screen/thumb
      if (deviceGroupRef.current) {
        deviceGroupRef.current.quaternion.copy(quat);
      }
      
      // Set deviceCamera quaternion directly (matching ARCameraView approach)
      if (deviceCameraRef.current) {
        const alpha = (newOrientation.alpha ?? 0) * DEG2RAD;
        const beta = (newOrientation.beta ?? 0) * DEG2RAD;
        const gamma = (newOrientation.gamma ?? 0) * DEG2RAD;
        setObjectQuaternion(deviceCameraRef.current.quaternion, alpha, beta, gamma, 0, THREE);
        deviceCameraRef.current.updateProjectionMatrix();
      }
      
      fovHelperRef.current?.update();
      
      onOrientationChange?.(newOrientation);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOrientationChange]);

  // Update AR content
  useEffect(() => {
    if (!sceneRef.current || !trajectory) return;

    const scene = sceneRef.current;
    
    // Cleanup old content
    if (aboveHorizonArcRef.current) {
      scene.remove(aboveHorizonArcRef.current);
      aboveHorizonArcRef.current.geometry.dispose();
      (aboveHorizonArcRef.current.material as THREE.Material).dispose();
      aboveHorizonArcRef.current = null;
    }
    if (belowHorizonArcRef.current) {
      scene.remove(belowHorizonArcRef.current);
      belowHorizonArcRef.current.geometry.dispose();
      (belowHorizonArcRef.current.material as THREE.Material).dispose();
      belowHorizonArcRef.current = null;
    }
    if (markersRef.current) {
      scene.remove(markersRef.current);
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
      scene.remove(currentIndicatorRef.current);
      currentIndicatorRef.current.geometry.dispose();
      (currentIndicatorRef.current.material as THREE.Material).dispose();
      currentIndicatorRef.current = null;
    }
    if (horizonPlaneRef.current) {
      scene.remove(horizonPlaneRef.current);
      horizonPlaneRef.current.geometry.dispose();
      (horizonPlaneRef.current.material as THREE.Material).dispose();
      horizonPlaneRef.current = null;
    }
    if (compassRef.current) {
      scene.remove(compassRef.current);
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

    // Create AR content
    const { aboveHorizonArc, belowHorizonArc, markers, currentIndicator, horizonPlane, compass } = createARContent(
      scene,
      trajectory,
      THREE
    );
    aboveHorizonArcRef.current = aboveHorizonArc;
    belowHorizonArcRef.current = belowHorizonArc;
    markersRef.current = markers;
    currentIndicatorRef.current = currentIndicator;
    horizonPlaneRef.current = horizonPlane;
    compassRef.current = compass;
  }, [trajectory, sceneReady]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border border-white/10 bg-black"
      style={{ display: 'block', height: `${height}px`, maxHeight: '100%' }}
    />
  );
}

