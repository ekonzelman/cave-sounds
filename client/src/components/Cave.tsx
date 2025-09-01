import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import SongNode from './SongNode';
import * as THREE from 'three';

export default function Cave() {
  const caveRef = useRef<THREE.Group>(null);
  const { songNodes } = useMusicExplorer();
  const { camera } = useThree();
  const [revealedLayers, setRevealedLayers] = useState<number>(1);
  
  // Handle clicks to reveal new layers
  const handleClick = () => {
    setRevealedLayers(prev => Math.min(prev + 1, 5));
  };

  // Generate point cloud cave layers
  const caveLayers = useMemo(() => {
    const layers = [];
    
    for (let layerIndex = 0; layerIndex < 5; layerIndex++) {
      const layerPoints = [];
      const particleCount = 3000 + layerIndex * 1000;
      
      // Create cave-like point distribution
      for (let i = 0; i < particleCount; i++) {
        // Generate cave-like structure with multiple chambers
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * (20 + layerIndex * 10);
        const height = Math.random() * 15;
        
        // Create organic cave shapes
        const noise = Math.sin(angle * 3) * Math.cos(height * 0.1) * 2;
        const caveRadius = radius + noise;
        
        const x = Math.cos(angle) * caveRadius;
        const y = height - 2 + Math.sin(i * 0.01) * 3;
        const z = Math.sin(angle) * caveRadius;
        
        // Add some stalactites and stalagmites
        if (Math.random() < 0.3) {
          const stalactiteHeight = Math.random() < 0.5 ? 12 : -2;
          layerPoints.push(x, stalactiteHeight + Math.random() * 3, z);
        } else {
          layerPoints.push(x, y, z);
        }
      }
      
      layers.push(new Float32Array(layerPoints));
    }
    
    return layers;
  }, []);

  // Floating fluorescent particles for atmosphere
  const floatingParticles = useMemo(() => {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      
      // Fluorescent colors
      const colorChoice = Math.floor(Math.random() * 4);
      switch (colorChoice) {
        case 0: // Cyan
          colors[i * 3] = 0;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 1;
          break;
        case 1: // Magenta
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 0;
          colors[i * 3 + 2] = 1;
          break;
        case 2: // Yellow
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 0;
          break;
        default: // White
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 1;
      }
    }
    
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (caveRef.current) {
      // Animate floating particles
      const time = state.clock.elapsedTime;
      caveRef.current.children.forEach((child, index) => {
        if (child.type === 'Points' && child.userData.isFloating) {
          child.rotation.y = Math.sin(time * 0.1 + index) * 0.02;
          child.position.y = Math.sin(time * 0.2 + index * 0.5) * 0.5;
        }
      });
    }
  });

  return (
    <group ref={caveRef} onClick={handleClick}>
      {/* Point cloud cave layers */}
      {caveLayers.slice(0, revealedLayers).map((layerPoints, layerIndex) => (
        <points key={`layer-${layerIndex}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={layerPoints}
              count={layerPoints.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffffff"
            size={0.02 + layerIndex * 0.01}
            transparent
            opacity={0.8 - layerIndex * 0.1}
            vertexColors={false}
          />
        </points>
      ))}

      {/* Floating fluorescent particles */}
      <points userData={{ isFloating: true }}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={floatingParticles.positions}
            count={floatingParticles.positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={floatingParticles.colors}
            count={floatingParticles.colors.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          transparent
          opacity={0.9}
          vertexColors
          blending={THREE.AdditiveBlending}
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

      {/* Fluorescent stalactites/stalagmites */}
      {[...Array(20)].map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 10 + Math.random() * 25;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const isUp = Math.random() > 0.5;
        
        return (
          <mesh
            key={`stalactite-${i}`}
            position={[x, isUp ? 12 : -1, z]}
            rotation={isUp ? [0, 0, 0] : [Math.PI, 0, 0]}
          >
            <coneGeometry args={[0.2, 3 + Math.random() * 4, 8]} />
            <meshBasicMaterial
              color={`hsl(${Math.random() * 360}, 80%, 60%)`}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
      
      {/* Layer revelation hint */}
      {revealedLayers < 5 && (
        <mesh position={[0, 1, 0]} visible={false}>
          <sphereGeometry args={[200, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}
