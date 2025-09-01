import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import SongNode from './SongNode';
import * as THREE from 'three';

export default function Cave() {
  const caveRef = useRef<THREE.Group>(null);
  const { songNodes } = useMusicExplorer();
  
  // Load textures for cave walls
  const stoneTexture = useTexture('/textures/asphalt.png');
  const groundTexture = useTexture('/textures/sand.jpg');

  // Configure textures
  stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(4, 4);
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(8, 8);

  // Generate cave geometry
  const caveGeometry = useMemo(() => {
    const walls = [];
    const tunnels = [];
    
    // Main chamber
    walls.push({
      position: [0, 5, -25],
      scale: [50, 10, 2],
      rotation: [0, 0, 0]
    });
    walls.push({
      position: [0, 5, 25],
      scale: [50, 10, 2],
      rotation: [0, 0, 0]
    });
    walls.push({
      position: [-25, 5, 0],
      scale: [2, 10, 50],
      rotation: [0, 0, 0]
    });
    walls.push({
      position: [25, 5, 0],
      scale: [2, 10, 50],
      rotation: [0, 0, 0]
    });

    // Ceiling
    walls.push({
      position: [0, 10, 0],
      scale: [50, 2, 50],
      rotation: [0, 0, 0]
    });

    // Side tunnels
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * 30;
      const z = Math.sin(angle) * 30;
      
      tunnels.push({
        position: [x, 3, z],
        scale: [3, 6, 15],
        rotation: [0, angle, 0]
      });
    }

    return { walls, tunnels };
  }, []);

  // Ambient cave particles
  const particles = useMemo(() => {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    
    return positions;
  }, []);

  useFrame((state) => {
    if (caveRef.current) {
      // Subtle ambient animation
      caveRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={caveRef}>
      {/* Ground */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshLambertMaterial map={groundTexture} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} />
      </mesh>

      {/* Cave walls */}
      {caveGeometry.walls.map((wall, index) => (
        <mesh
          key={`wall-${index}`}
          position={wall.position as [number, number, number]}
          scale={wall.scale as [number, number, number]}
          rotation={wall.rotation as [number, number, number]}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshLambertMaterial map={stoneTexture} color="#3a3a3a" />
        </mesh>
      ))}

      {/* Cave tunnels */}
      {caveGeometry.tunnels.map((tunnel, index) => (
        <group
          key={`tunnel-${index}`}
          position={tunnel.position as [number, number, number]}
          rotation={tunnel.rotation as [number, number, number]}
        >
          {/* Tunnel walls */}
          <mesh position={[-1.5, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 6, 15]} />
            <meshLambertMaterial map={stoneTexture} color="#2a2a2a" />
          </mesh>
          <mesh position={[1.5, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 6, 15]} />
            <meshLambertMaterial map={stoneTexture} color="#2a2a2a" />
          </mesh>
          {/* Tunnel ceiling */}
          <mesh position={[0, 3, 0]} castShadow>
            <boxGeometry args={[3, 0.5, 15]} />
            <meshLambertMaterial map={stoneTexture} color="#1a1a1a" />
          </mesh>
        </group>
      ))}

      {/* Ambient particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particles}
            count={particles.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#4a4a7a"
          size={0.1}
          transparent
          opacity={0.6}
        />
      </points>

      {/* Song nodes */}
      {songNodes.map((node) => (
        <SongNode
          key={node.id}
          position={node.position}
          songData={node}
        />
      ))}

      {/* Mystical crystal formations */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 15 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <mesh
            key={`crystal-${i}`}
            position={[x, 1 + Math.random() * 3, z]}
            castShadow
          >
            <coneGeometry args={[0.5, 2 + Math.random() * 2, 6]} />
            <meshPhongMaterial
              color={`hsl(${240 + Math.random() * 60}, 70%, 60%)`}
              transparent
              opacity={0.7}
              emissive={`hsl(${240 + Math.random() * 60}, 50%, 20%)`}
            />
          </mesh>
        );
      })}
    </group>
  );
}
