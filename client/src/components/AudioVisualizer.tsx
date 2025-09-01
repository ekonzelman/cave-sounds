import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { useAudio } from '../lib/stores/useAudio';
import * as THREE from 'three';

interface AudioVisualizerProps {
  visualizationFilter?: 'bars' | 'wave' | 'spiral' | 'burst';
}

export default function AudioVisualizer({ visualizationFilter = 'bars' }: AudioVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { currentSong, audioAnalyzer } = useMusicExplorer();
  const { isMuted } = useAudio();
  
  const particleCount = 200;

  // Static particles (no animation to prevent shaking)
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 5 + Math.random() * 10;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 10 - 5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }
    
    return { positions, colors };
  }, []);

  // Static frequency bars (no animation)
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

  // No animations to prevent shaking
  useFrame(() => {
    // All audio visualization disabled for stability
    return;
  });

  if (!currentSong) return null;

  return (
    <group ref={groupRef} position={[0, 5, 0]}>
      {/* Static audio particles */}
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

      {/* Static frequency bars */}
      {frequencyBars.map((bar, index) => (
        <mesh
          key={`bar-${index}`}
          position={bar.position}
          rotation={bar.rotation}
          userData={{ isFrequencyBar: true, barIndex: index }}
        >
          <boxGeometry args={[0.2, 1, 0.2]} />
          <meshBasicMaterial color="#4ecdc4" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}