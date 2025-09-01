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
  
  // Cave atmosphere lighting
  const caveAmbientLight = useMemo(() => {
    return (
      <>
        {/* Warm ambient cave lighting */}
        <ambientLight intensity={0.1} color="#2c1810" />
        {/* Directional light from cave entrance */}
        <directionalLight
          position={[10, 20, 10]}
          intensity={0.3}
          color="#4a3728"
        />
        {/* Underground mineral glow */}
        <pointLight
          position={[0, -5, 0]}
          intensity={0.5}
          distance={50}
          color="#1a5490"
        />
      </>
    );
  }, []);

  // Generate point cloud cave layers
  const caveLayers = useMemo(() => {
    const layers = [];
    
    for (let layerIndex = 0; layerIndex < 5; layerIndex++) {
      const layerPoints = [];
      const particleCount = 3000 + layerIndex * 1000;
      
      // Create stable cave-like point distribution
      for (let i = 0; i < particleCount; i++) {
        // Generate cave-like structure with multiple chambers
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * (20 + layerIndex * 10);
        const height = Math.random() * 15;
        
        // Create stable organic cave shapes
        const noise = Math.sin(angle * 3) * Math.cos(height * 0.1) * 1;
        const caveRadius = radius + noise;
        
        const x = Math.cos(angle) * caveRadius;
        const y = height - 2 + Math.sin(i * 0.01) * 1; // Reduced noise
        const z = Math.sin(angle) * caveRadius;
        
        // Add stable cave features
        if (Math.random() < 0.2) {
          const stalactiteHeight = Math.random() < 0.5 ? 12 : -2;
          layerPoints.push(x, stalactiteHeight, z); // Removed random variation
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

  // Completely removed all animations to prevent any shaking or movement

  return (
    <group ref={caveRef} onClick={handleClick}>
      {/* Cave atmosphere lighting */}
      {caveAmbientLight}
      
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

      {/* Static fluorescent particles */}
      <points>
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

      {/* Realistic Stalactites - hanging from ceiling */}
      {[...Array(15)].map((_, i) => {
        const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 15 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 2 + Math.random() * 8;
        
        return (
          <group key={`stalactite-${i}`} position={[x, 15, z]}>
            {/* Main stalactite body */}
            <mesh>
              <coneGeometry args={[0.3 + Math.random() * 0.4, height, 8]} />
              <meshBasicMaterial
                color="#e6d7c3"
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Mineral deposits */}
            <mesh position={[0, -height/2, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial
                color={`hsl(${180 + Math.random() * 60}, 70%, 70%)`}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Realistic Stalagmites - rising from floor */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.3;
        const radius = 12 + Math.random() * 35;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 1 + Math.random() * 6;
        
        return (
          <group key={`stalagmite-${i}`} position={[x, -2, z]}>
            {/* Main stalagmite body */}
            <mesh>
              <coneGeometry args={[0.4 + Math.random() * 0.5, height, 8]} />
              <meshBasicMaterial
                color="#d4c4a0"
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Colorful mineral veins */}
            <mesh position={[0, height/2, 0]} scale={[1.1, 0.1, 1.1]}>
              <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
              <meshBasicMaterial
                color={`hsl(${Math.random() * 360}, 80%, 60%)`}
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Flowstone formations - bacon-like layered structures */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 20 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`flowstone-${i}`} position={[x, 5 + Math.random() * 5, z]}>
            {/* Multiple layers of flowstone */}
            {[...Array(5)].map((_, layer) => (
              <mesh
                key={layer}
                position={[0, -layer * 0.3, 0]}
                rotation={[0, Math.random() * 0.3, 0]}
                scale={[2 + layer * 0.2, 0.1, 1.5 + layer * 0.1]}
              >
                <cylinderGeometry args={[1, 1.2, 0.2, 16]} />
                <meshBasicMaterial
                  color={`hsl(${20 + layer * 10}, 60%, ${60 + layer * 5}%)`}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      
      {/* Aragonite crystal formations - branching structures */}
      {[...Array(6)].map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 25 + Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`aragonite-${i}`} position={[x, -1 + Math.random() * 8, z]}>
            {/* Main crystal trunk */}
            <mesh>
              <cylinderGeometry args={[0.1, 0.2, 2, 6]} />
              <meshBasicMaterial
                color="#e8f4f8"
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Crystal branches */}
            {[...Array(4)].map((_, branch) => {
              const branchAngle = (branch / 8) * Math.PI * 2;
              const branchX = Math.cos(branchAngle) * 0.8;
              const branchZ = Math.sin(branchAngle) * 0.8;
              
              return (
                <mesh
                  key={branch}
                  position={[branchX, 0.5 + Math.random() * 1, branchZ]}
                  rotation={[Math.random() * 0.5, branchAngle, 0.3]}
                >
                  <cylinderGeometry args={[0.05, 0.1, 1 + Math.random() * 0.5, 6]} />
                  <meshBasicMaterial
                    color={`hsl(${180 + Math.random() * 40}, 50%, 80%)`}
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              );
            })}
            {/* Crystal tips with glow */}
            <pointLight
              position={[0, 1.5, 0]}
              intensity={2}
              distance={8}
              color="#4dd0e1"
            />
          </group>
        );
      })}
      
      {/* Conulite formations - circular spiral patterns */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 30 + Math.random() * 10;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`conulite-${i}`} position={[x, 3 + Math.random() * 4, z]}>
            {/* Spiral rings */}
            {[...Array(6)].map((_, ring) => {
              const ringRadius = 0.3 + ring * 0.15;
              const ringHeight = ring * 0.1;
              
              return (
                <mesh
                  key={ring}
                  position={[0, ringHeight, 0]}
                  rotation={[0, ring * 0.3, 0]}
                >
                  <torusGeometry args={[ringRadius, 0.03, 4, 16]} />
                  <meshBasicMaterial
                    color={`hsl(${40 + ring * 5}, 70%, 65%)`}
                    transparent
                    opacity={0.8 - ring * 0.05}
                  />
                </mesh>
              );
            })}
            {/* Center glow */}
            <pointLight
              position={[0, 0.6, 0]}
              intensity={1.5}
              distance={6}
              color="#ffa726"
            />
          </group>
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
