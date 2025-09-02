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
  
  // Floor-anchored camera system - no more gimbal lock or flipping!
  const cameraForward = useRef(new THREE.Vector3(0, 0, -1)); // Initial forward direction
  const cameraRight = useRef(new THREE.Vector3(1, 0, 0));    // Initial right direction
  const worldUp = useRef(new THREE.Vector3(0, 1, 0));        // World up direction (floor normal)
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Cave floor level for anchoring
  const FLOOR_LEVEL = -10;

  // Set initial camera position and setup pointer lock
  useEffect(() => {
    camera.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    
    // Initialize camera vectors from current camera orientation
    camera.getWorldDirection(cameraForward.current);
    cameraForward.current.normalize();
    
    // Calculate right vector from forward and world up
    cameraRight.current.crossVectors(cameraForward.current, worldUp.current);
    cameraRight.current.normalize();
    
    // Ensure we're grounded to the floor
    cameraForward.current.y = 0; // Project forward onto floor plane
    cameraForward.current.normalize();
    
    // Pointer lock for mouse look - activated by L key to avoid click conflicts
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'l' || event.key === 'L') && !isPointerLocked) {
        document.body.requestPointerLock();
      } else if (event.key === 'Escape' && isPointerLocked) {
        document.exitPointerLock();
      }
    };
    
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === document.body);
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === document.body) {
        try {
          // Floor-anchored camera system - stable and grounded!
          const sensitivity = 0.002; // Smooth sensitivity
          
          const mouseX = event.movementX * sensitivity;
          const mouseY = event.movementY * sensitivity;
          
          // HORIZONTAL ROTATION (left/right) - rotate around world up axis
          if (Math.abs(mouseX) > 0.001) {
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(worldUp.current, -mouseX);
            
            // Rotate forward and right vectors around world up
            cameraForward.current.applyMatrix4(rotationMatrix);
            cameraRight.current.crossVectors(cameraForward.current, worldUp.current);
            cameraRight.current.normalize();
          }
          
          // VERTICAL ROTATION (up/down) - rotate around right axis with limits
          if (Math.abs(mouseY) > 0.001) {
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(cameraRight.current, -mouseY);
            
            // Calculate new forward direction
            const newForward = cameraForward.current.clone();
            newForward.applyMatrix4(rotationMatrix);
            
            // Check if this rotation would flip us upside-down
            // Limit vertical angle to prevent looking too far up/down
            const maxVerticalAngle = 0.8; // ~45 degrees up/down from horizontal
            
            if (Math.abs(newForward.y) < maxVerticalAngle) {
              cameraForward.current.copy(newForward);
              cameraForward.current.normalize();
            }
          }
          
          // CONSTRUCT CAMERA MATRIX from our stable vectors
          // This ensures the camera never flips and stays grounded
          const lookAtMatrix = new THREE.Matrix4();
          const cameraPosition = camera.position.clone();
          const targetPosition = cameraPosition.clone().add(cameraForward.current);
          
          lookAtMatrix.lookAt(cameraPosition, targetPosition, worldUp.current);
          camera.matrix.copy(lookAtMatrix);
          camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
          
        } catch (error) {
          console.warn('Mouse look error:', error);
          // Reset to safe forward direction
          cameraForward.current.set(0, 0, -1);
          cameraRight.current.set(1, 0, 0);
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
