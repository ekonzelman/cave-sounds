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
  
  // Ultra-safe camera system with BOTH horizontal and vertical limits
  const yaw = useRef(0);   // Horizontal rotation (left/right) - LIMITED to prevent spinning
  const pitch = useRef(0); // Vertical rotation (up/down) - LIMITED to prevent flipping
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // SMOOTH LIMITS - with gradual resistance near boundaries
  const SOFT_PITCH_LIMIT = Math.PI / 5;    // 36 degrees (comfortable range)
  const HARD_PITCH_LIMIT = Math.PI / 4;    // 45 degrees (absolute max)
  const SOFT_YAW_LIMIT = Math.PI * 0.6;    // 108 degrees (comfortable range)
  const HARD_YAW_LIMIT = Math.PI * 0.75;   // 135 degrees (absolute max)
  
  // Reference object positions for orientation checking
  const LIGHT_SOURCE_POS = new THREE.Vector3(0, 50, 0);  // Always above
  const BLACK_HOLE_POS = new THREE.Vector3(0, -50, 0);   // Always below
  
  // Smooth validation state
  const debugCount = useRef(0);
  const validationCount = useRef(0);
  const lastResetTime = useRef(0);

  // Set initial camera position and setup pointer lock
  useEffect(() => {
    camera.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    
    // Initialize camera angles from current orientation
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw.current = euler.y;
    pitch.current = Math.max(-HARD_PITCH_LIMIT, Math.min(HARD_PITCH_LIMIT, euler.x)); // Clamp initial pitch
    
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
        pitch.current = 0;
        yaw.current = 0;
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
          // ULTRA-SAFE camera system with comprehensive debugging
          const sensitivity = 0.002;
          
          const mouseX = event.movementX * sensitivity;
          const mouseY = event.movementY * sensitivity;
          
          // Store previous values for debugging
          const prevYaw = yaw.current;
          const prevPitch = pitch.current;
          
          // UPDATE YAW (horizontal rotation) - SMOOTH LIMITING
          let newYaw = yaw.current - mouseX;
          
          // Apply smooth resistance as we approach limits
          if (Math.abs(newYaw) > SOFT_YAW_LIMIT) {
            const overLimit = Math.abs(newYaw) - SOFT_YAW_LIMIT;
            const resistance = Math.min(overLimit / (HARD_YAW_LIMIT - SOFT_YAW_LIMIT), 1);
            const dampening = 1 - (resistance * 0.8); // Reduce movement by up to 80%
            newYaw = yaw.current - (mouseX * dampening);
          }
          
          // Hard clamp at absolute limit
          newYaw = Math.max(-HARD_YAW_LIMIT, Math.min(HARD_YAW_LIMIT, newYaw));
          yaw.current = newYaw;
          
          // UPDATE PITCH (vertical rotation) - SMOOTH LIMITING
          let newPitch = pitch.current - mouseY;
          
          // Apply smooth resistance as we approach limits  
          if (Math.abs(newPitch) > SOFT_PITCH_LIMIT) {
            const overLimit = Math.abs(newPitch) - SOFT_PITCH_LIMIT;
            const resistance = Math.min(overLimit / (HARD_PITCH_LIMIT - SOFT_PITCH_LIMIT), 1);
            const dampening = 1 - (resistance * 0.9); // Stronger dampening for pitch
            newPitch = pitch.current - (mouseY * dampening);
          }
          
          // Hard clamp at absolute limit
          newPitch = Math.max(-HARD_PITCH_LIMIT, Math.min(HARD_PITCH_LIMIT, newPitch));
          pitch.current = newPitch;
          
          // COMPREHENSIVE DEBUGGING - Log every 30 frames
          debugCount.current++;
          if (debugCount.current % 30 === 0) {
            console.log('CAMERA DEBUG:', {
              mouseInput: { x: mouseX.toFixed(4), y: mouseY.toFixed(4) },
              angles: { 
                yaw: (yaw.current * 180 / Math.PI).toFixed(1) + '°',
                pitch: (pitch.current * 180 / Math.PI).toFixed(1) + '°'
              },
              limits: {
                yawRange: `${(-HARD_YAW_LIMIT * 180 / Math.PI).toFixed(0)}° to ${(HARD_YAW_LIMIT * 180 / Math.PI).toFixed(0)}°`,
                pitchRange: `${(-HARD_PITCH_LIMIT * 180 / Math.PI).toFixed(0)}° to ${(HARD_PITCH_LIMIT * 180 / Math.PI).toFixed(0)}°`
              },
              clamped: {
                yaw: prevYaw !== yaw.current,
                pitch: prevPitch !== pitch.current
              }
            });
          }
          
          // APPLY ROTATIONS using safe Euler angles
          const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
          camera.quaternion.setFromEuler(euler);
          
          // SMOOTH REFERENCE VALIDATION - validate every 10 frames to reduce jitter
          validationCount.current++;
          if (validationCount.current % 10 === 0) {
            
            // Project reference objects to screen space
            const lightSourceScreen = LIGHT_SOURCE_POS.clone().project(camera);
            const blackHoleScreen = BLACK_HOLE_POS.clone().project(camera);
            
            // More tolerant validation with margin for smooth movement
            const MARGIN = 0.3; // Allow 30% margin before correction
            const lightIsAbove = lightSourceScreen.y > -MARGIN;  // Allow some downward drift
            const blackIsBelow = blackHoleScreen.y < MARGIN;     // Allow some upward drift
            
            // Only trigger correction if we're WAY off AND enough time has passed
            const currentTime = performance.now();
            const timeSinceLastReset = currentTime - lastResetTime.current;
            
            if ((!lightIsAbove || !blackIsBelow) && timeSinceLastReset > 1000) { // Wait 1 second between resets
              
              // GENTLE CORRECTION instead of hard reset
              const targetPitch = pitch.current * 0.7; // Gradually move toward center
              const targetYaw = yaw.current * 0.7;     // Gradually move toward center
              
              pitch.current = targetPitch;
              yaw.current = targetYaw;
              
              lastResetTime.current = currentTime;
              
              if (debugCount.current % 30 === 0) {
                console.log('Gentle orientation correction applied', {
                  lightSource: { y: lightSourceScreen.y.toFixed(3), isAbove: lightIsAbove },
                  blackHole: { y: blackHoleScreen.y.toFixed(3), isBelow: blackIsBelow },
                  correction: { pitch: targetPitch.toFixed(3), yaw: targetYaw.toFixed(3) }
                });
              }
            }
          }
          
          // Gentle camera up vector safety check
          const cameraUp = new THREE.Vector3(0, 1, 0);
          cameraUp.applyQuaternion(camera.quaternion);
          
          if (cameraUp.y < 0.4) { // Only if severely tilted
            const correctionStrength = 0.05; // Very gentle correction
            pitch.current *= (1 - correctionStrength);
            yaw.current *= (1 - correctionStrength);
          }
          
        } catch (error) {
          console.error('Mouse look error:', error);
          // Complete reset on any error
          pitch.current = 0;
          yaw.current = 0;
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
