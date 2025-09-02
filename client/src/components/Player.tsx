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
  
  // Mouse look state - track angles directly for smoother movement
  const pitch = useRef(0); // X rotation (up/down)
  const yaw = useRef(0);   // Y rotation (left/right)
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Smoothing state for mouse movement
  const lastMouseTime = useRef(0);

  // Set initial camera position and setup pointer lock
  useEffect(() => {
    camera.position.set(playerPosition.x, playerPosition.y + 2, playerPosition.z);
    
    // Initialize mouse look angles from current camera rotation
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    pitch.current = euler.x;
    yaw.current = euler.y;
    lastMouseTime.current = performance.now();
    
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
          // Smoother sensitivity with frame-rate independence  
          const sensitivity = 0.0012; // Reduced for smoother movement
          
          // Apply mouse movement directly to pitch/yaw for smoother control
          const mouseX = event.movementX * sensitivity;
          const mouseY = event.movementY * sensitivity;
          
          // Update yaw (left/right) - unlimited horizontal rotation
          yaw.current -= mouseX;
          
          // Update pitch (up/down) with smooth clamping
          const targetPitch = pitch.current - mouseY;
          const maxPitch = Math.PI * 0.44; // ~80 degrees for comfort
          
          // Smooth exponential clamping to prevent sudden boundary jumps
          const dampingFactor = 0.95;
          if (targetPitch > maxPitch) {
            pitch.current = maxPitch * dampingFactor + pitch.current * (1 - dampingFactor);
          } else if (targetPitch < -maxPitch) {
            pitch.current = -maxPitch * dampingFactor + pitch.current * (1 - dampingFactor);
          } else {
            pitch.current = targetPitch;
          }
          
          // Create clean euler rotation from our tracked angles
          const euler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
          camera.quaternion.setFromEuler(euler);
          
        } catch (error) {
          console.warn('Mouse look error:', error);
          // Reset angles on error
          pitch.current = 0;
          yaw.current = 0;
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
