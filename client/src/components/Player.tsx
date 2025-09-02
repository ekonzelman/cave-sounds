import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { useAudio } from '../lib/stores/useAudio';
import * as THREE from 'three';

enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  upward = 'upward',
  downward = 'downward',
  interact = 'interact'
}

export default function Player() {
  const playerRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { playerPosition, setPlayerPosition, checkSongNodeInteraction, discoveredNodes } = useMusicExplorer();
  const { playHit } = useAudio();
  
  const [subscribeKeys, getKeys] = useKeyboardControls<Controls>();
  
  // Movement state
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const lastFootstepTime = useRef(0);
  
  // Smooth camera system with easing and reduced velocity
  // Target angles (updated by mouse movement)
  const targetYaw = useRef(0);   // Target horizontal rotation
  const targetPitch = useRef(0); // Target vertical rotation
  // Current angles (smoothly interpolated towards targets)
  const currentYaw = useRef(0);   // Current horizontal rotation
  const currentPitch = useRef(0); // Current vertical rotation
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // FULL ROTATION LIMITS - Complete freedom of movement
  const MAX_PITCH = Math.PI / 2;    // 90 degrees - straight up
  const MIN_PITCH = -Math.PI / 2;   // -90 degrees - straight down
  // No yaw limits - full 360° horizontal rotation allowed
  
  // Debug state
  const debugCount = useRef(0);

  // Set initial camera position and setup pointer lock
  useEffect(() => {
    camera.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    
    // Initialize camera angles from current orientation
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    targetYaw.current = currentYaw.current = euler.y;
    targetPitch.current = currentPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, euler.x)); // Clamp initial pitch
    
    // Pointer lock for mouse look - activated by L key to avoid click conflicts
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'l' || event.key === 'L') && !isPointerLocked) {
        document.body.requestPointerLock();
      } else if (event.key === 'Escape' && isPointerLocked) {
        document.exitPointerLock();
      }
      
      // EMERGENCY CAMERA RESET - Press R to reset camera to safe position
      if ((event.key === 'r' || event.key === 'R') && isPointerLocked) {
        console.log('Manual camera reset triggered - resetting to safe position');
        targetPitch.current = currentPitch.current = 0;
        targetYaw.current = currentYaw.current = 0;
        camera.quaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));
        console.log('Camera reset complete: yaw=0°, pitch=0°');
      }
    };
    
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === document.body);
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === document.body) {
        try {
          // SMOOTH camera system - tuned velocity with easing
          const sensitivity = 0.0015; // BALANCED: Sweet spot between responsiveness and smoothness
          
          // Cap mouse deltas to prevent extreme jumps
          const maxDelta = 0.025; // Also reduced for smoother movement
          const rawMouseX = event.movementX * sensitivity;
          const rawMouseY = event.movementY * sensitivity;
          
          const mouseX = Math.max(-maxDelta, Math.min(maxDelta, rawMouseX));
          const mouseY = Math.max(-maxDelta, Math.min(maxDelta, rawMouseY));
          
          // UPDATE TARGET ANGLES (what we want to reach)
          targetYaw.current -= mouseX;
          targetPitch.current -= mouseY;
          
          // Clamp target pitch to prevent over-rotation
          targetPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch.current));
          
          // NOTE: Actual camera rotation now happens in useFrame for smooth interpolation
          
        } catch (error) {
          console.error('Mouse look error:', error);
          // Complete reset on any error
          targetPitch.current = currentPitch.current = 0;
          targetYaw.current = currentYaw.current = 0;
          camera.quaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));
          if (document.exitPointerLock) {
            document.exitPointerLock();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera]);

  // Handle interactions
  useEffect(() => {
    return subscribeKeys(
      (state) => state.interact,
      (pressed) => {
        if (pressed) {
          console.log('Interact key pressed');
          checkSongNodeInteraction();
        }
      }
    );
  }, [subscribeKeys, checkSongNodeInteraction]);

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    // SMOOTH CAMERA INTERPOLATION - Easing between current and target rotation
    if (isPointerLocked) {
      const lerpSpeed = 8; // Adjust this for faster/slower easing (higher = faster catch up)
      
      // Smoothly interpolate current angles towards target angles
      currentYaw.current = THREE.MathUtils.lerp(currentYaw.current, targetYaw.current, delta * lerpSpeed);
      currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, targetPitch.current, delta * lerpSpeed);
      
      // Apply the smoothed rotation to camera
      const yawQuaternion = new THREE.Quaternion();
      const pitchQuaternion = new THREE.Quaternion();
      
      yawQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentYaw.current);
      pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), currentPitch.current);
      
      camera.quaternion.multiplyQuaternions(yawQuaternion, pitchQuaternion);
      
      // Debug log every few seconds
      debugCount.current++;
      if (debugCount.current % 300 === 0) {
        console.log('Smooth camera:', {
          target: { 
            yaw: (targetYaw.current * 180 / Math.PI).toFixed(1) + '°', 
            pitch: (targetPitch.current * 180 / Math.PI).toFixed(1) + '°'
          },
          current: { 
            yaw: (currentYaw.current * 180 / Math.PI).toFixed(1) + '°', 
            pitch: (currentPitch.current * 180 / Math.PI).toFixed(1) + '°'
          }
        });
      }
    }

    const keys = getKeys();
    const moveSpeed = 8;
    const dampening = 0.9;

    // Reset direction
    direction.current.set(0, 0, 0);

    // Calculate movement direction based on camera (full 3D)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();
    
    const up = new THREE.Vector3(0, 1, 0); // World up for vertical movement

    // Apply input for all 6 directions
    if (keys.forward) {
      direction.current.add(forward);
    }
    if (keys.backward) {
      direction.current.sub(forward);
    }
    if (keys.leftward) {
      direction.current.sub(right);
    }
    if (keys.rightward) {
      direction.current.add(right);
    }
    if (keys.upward) {
      direction.current.add(up);
    }
    if (keys.downward) {
      direction.current.sub(up);
    }

    // Normalize and apply speed
    if (direction.current.length() > 0) {
      direction.current.normalize().multiplyScalar(moveSpeed * delta);
      velocity.current.add(direction.current);
      
      // Play footstep sounds
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastFootstepTime.current > 0.5) {
        playHit(); // Using hit sound as footstep placeholder
        lastFootstepTime.current = currentTime;
      }
    }

    // Apply dampening
    velocity.current.multiplyScalar(dampening);

    // Update position with expanded boundary for point cloud cave (full 3D)
    const newPosition = new THREE.Vector3().copy(playerPosition).add(velocity.current);
    
    // Expanded boundary for larger point cloud cave (3D bounds)
    const boundary = 50;
    const heightLimit = 30; // Maximum height
    const floorLevel = -10; // Minimum height (below cave floor)
    
    newPosition.x = Math.max(-boundary, Math.min(boundary, newPosition.x));
    newPosition.z = Math.max(-boundary, Math.min(boundary, newPosition.z));
    newPosition.y = Math.max(floorLevel, Math.min(heightLimit, newPosition.y));

    // Update player position
    setPlayerPosition(newPosition);
    
    // Update camera to follow player (first-person)
    camera.position.x = newPosition.x;
    camera.position.y = newPosition.y + 1.6; // Eye height
    camera.position.z = newPosition.z;
    
    // Update player mesh position
    playerRef.current.position.copy(newPosition);

    console.log('Player position:', newPosition.x.toFixed(2), newPosition.y.toFixed(2), newPosition.z.toFixed(2));
  });

  return (
    <group ref={playerRef}>
      {/* Invisible player collision box */}
      <mesh position={[0, 1, 0]} visible={false}>
        <capsuleGeometry args={[0.5, 1]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Player presence indicator - glowing orb */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Enhanced light for point cloud visibility */}
      <pointLight
        position={[0, 1.5, 0]}
        intensity={3}
        distance={30}
        color="#ffffff"
      />
    </group>
  );
}
