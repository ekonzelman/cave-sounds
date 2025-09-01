import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import * as THREE from 'three';

export default function AudioVisualizer() {
  const { currentSong, audioAnalyzer, visualizationFilter } = useMusicExplorer();
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  
  // Create visualization particles
  const particleCount = 256;
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 5 + Math.random() * 15;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 10 - 5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }
    
    return { positions, colors };
  }, []);

  // Frequency bars
  const frequencyBars = useMemo(() => {
    const bars = [];
    const barCount = 64;
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 8;
      
      bars.push({
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number]
      });
    }
    
    return bars;
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !currentSong || !audioAnalyzer) return;

    const frequencyData = audioAnalyzer.getFrequencyData();
    const waveformData = audioAnalyzer.getWaveformData();
    
    if (!frequencyData || !waveformData) return;

    // Update particle positions based on audio
    groupRef.current.children.forEach((child, index) => {
      if (child.type === 'Points') {
        const geometry = (child as THREE.Points).geometry as THREE.BufferGeometry;
        const positions = geometry.attributes.position.array as Float32Array;
        const colors = geometry.attributes.color.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          const freqIndex = Math.floor((i / particleCount) * frequencyData.length);
          const amplitude = frequencyData[freqIndex] / 255;
          
          // Apply different visualization filters
          switch (visualizationFilter) {
            case 'wave':
              positions[i * 3 + 1] = Math.sin(state.clock.elapsedTime * 2 + i * 0.1) * amplitude * 5;
              break;
            case 'spiral':
              const spiralAngle = state.clock.elapsedTime + i * 0.1;
              positions[i * 3] = Math.cos(spiralAngle) * (5 + amplitude * 10);
              positions[i * 3 + 2] = Math.sin(spiralAngle) * (5 + amplitude * 10);
              break;
            case 'burst':
              const distance = 5 + amplitude * 15;
              const angle = (i / particleCount) * Math.PI * 2;
              positions[i * 3] = Math.cos(angle) * distance;
              positions[i * 3 + 2] = Math.sin(angle) * distance;
              break;
            default: // 'bars'
              positions[i * 3 + 1] = amplitude * 8;
          }
          
          // Update colors based on frequency
          colors[i * 3] = amplitude;
          colors[i * 3 + 1] = Math.sin(state.clock.elapsedTime + i * 0.1) * 0.5 + 0.5;
          colors[i * 3 + 2] = 1 - amplitude;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
      }
      
      // Update frequency bars
      if (child.type === 'Mesh' && child.userData.isFrequencyBar) {
        const barIndex = child.userData.barIndex;
        const freqIndex = Math.floor((barIndex / 64) * frequencyData.length);
        const amplitude = frequencyData[freqIndex] / 255;
        
        child.scale.y = 0.1 + amplitude * 5;
        (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(amplitude * 0.7, 1, 0.5)
        });
      }
    });
  });

  if (!currentSong) return null;

  return (
    <group ref={groupRef} position={[0, 5, 0]}>
      {/* Audio-reactive particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particles.positions}
            count={particleCount}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={particles.colors}
            count={particleCount}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          transparent
          opacity={0.8}
          vertexColors
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Frequency bars */}
      {frequencyBars.map((bar, index) => (
        <mesh
          key={`freq-bar-${index}`}
          position={bar.position}
          rotation={bar.rotation}
          userData={{ isFrequencyBar: true, barIndex: index }}
        >
          <boxGeometry args={[0.2, 1, 0.2]} />
          <meshBasicMaterial color="#4a90e2" />
        </mesh>
      ))}

      {/* Central visualization sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ff6b6b"
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </group>
  );
}
