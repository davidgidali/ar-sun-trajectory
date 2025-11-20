import type * as THREEType from 'three';
import type { SunTrajectory } from './sunTrajectory';
import { sunPositionTo3D } from './sunTrajectory';

interface ARContent {
  aboveHorizonArc: THREEType.Line;
  belowHorizonArc: THREEType.Line;
  markers: THREEType.Group;
  currentIndicator: THREEType.Mesh | null;
  horizonPlane: THREEType.Mesh;
  compass: THREEType.Group;
}

/**
 * Builds the shared AR scene content (sun arc, hourly markers, current position).
 * This helper should be edited when adding new AR visuals so both the mobile AR
 * scene and the desktop editor stay in sync.
 */
export function createARContent(
  scene: THREEType.Scene,
  trajectory: SunTrajectory,
  THREE: typeof THREEType
): ARContent {
  const aboveHorizonPoints: THREEType.Vector3[] = [];
  const belowHorizonPoints: THREEType.Vector3[] = [];
  const markerGroup = new THREE.Group();

  trajectory.positions.forEach((position, index) => {
    const pos3D = sunPositionTo3D(position);
    const point = new THREE.Vector3(pos3D.x * 10, pos3D.y * 10, pos3D.z * 10);
    
    // Split points based on altitude (above or below horizon)
    if (position.altitude >= 0) {
      aboveHorizonPoints.push(point);
      
      // Markers only for above-horizon points
      if (index > 0 && index < trajectory.positions.length - 1) {
        const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        markerGroup.add(marker);
      }
    } else {
      belowHorizonPoints.push(point);
    }
  });

  // Bright arc for above horizon
  const aboveGeometry = new THREE.BufferGeometry().setFromPoints(aboveHorizonPoints);
  const aboveMaterial = new THREE.LineBasicMaterial({
    color: 0xffaa00,
    linewidth: 5,
  });
  const aboveHorizonArc = new THREE.Line(aboveGeometry, aboveMaterial);

  // Gray arc for below horizon
  const belowGeometry = new THREE.BufferGeometry().setFromPoints(belowHorizonPoints);
  const belowMaterial = new THREE.LineBasicMaterial({
    color: 0x666666,
    linewidth: 3,
    transparent: true,
    opacity: 0.4,
  });
  const belowHorizonArc = new THREE.Line(belowGeometry, belowMaterial);
  
  // Log trajectory bounds for debugging
  const allPoints = [...aboveHorizonPoints, ...belowHorizonPoints];
  if (allPoints.length > 0) {
    const bounds = {
      minX: Math.min(...allPoints.map(p => p.x)),
      maxX: Math.max(...allPoints.map(p => p.x)),
      minY: Math.min(...allPoints.map(p => p.y)),
      maxY: Math.max(...allPoints.map(p => p.y)),
      minZ: Math.min(...allPoints.map(p => p.z)),
      maxZ: Math.max(...allPoints.map(p => p.z)),
    };
    console.log('AR Content: Trajectory bounds', bounds);
  }
  scene.add(aboveHorizonArc);
  scene.add(belowHorizonArc);
  scene.add(markerGroup);

  // Horizon plane at y=0
  const horizonGeometry = new THREE.PlaneGeometry(100, 100);
  const horizonMaterial = new THREE.MeshBasicMaterial({
    color: 0x2a2a2a,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const horizonPlane = new THREE.Mesh(horizonGeometry, horizonMaterial);
  horizonPlane.rotation.x = -Math.PI / 2; // Lie flat (horizontal)
  horizonPlane.position.y = 0;
  scene.add(horizonPlane);

  // Flat compass with N/E/S/W directions
  const compass = new THREE.Group();

  // Helper to create flat arrow + label
  const createCompassArrow = (
    direction: THREEType.Vector3,
    position: THREEType.Vector3,
    color: number,
    label: string
  ) => {
    // Create arrow pointing in direction, lying flat on ground
    const arrow = new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(position.x, -0.1, position.z),
      2, // length
      color,
      0.6, // head length
      0.4 // head width
    );
 //   arrow.setRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); // Lie flat
    
    // Create text sprite for label
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(position.x, 0.3, position.z); // Above the arrow
        sprite.scale.set(0.8, 0.8, 0.8);
        compass.add(sprite);
      }
    }
    
    compass.add(arrow);
  };

  // Create 4 cardinal directions
  createCompassArrow(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 3), 0xff0000, 'N'); // North (red)
  createCompassArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(3, 0, 0), 0x00ff00, 'E'); // East (green)
  createCompassArrow(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -3), 0x4444ff, 'S'); // South (blue)
  createCompassArrow(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-3, 0, 0), 0xffff00, 'W'); // West (yellow)

  scene.add(compass);

  let currentIndicator: THREEType.Mesh | null = null;
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
    scene.add(indicator);
    currentIndicator = indicator;
  }

  return {
    aboveHorizonArc,
    belowHorizonArc,
    markers: markerGroup,
    currentIndicator,
    horizonPlane,
    compass,
  };
}


