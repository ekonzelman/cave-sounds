import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { useAudio } from '../lib/stores/useAudio';
import * as THREE from 'three';

interface AudioVisualizerProps {
  visualizationFilter?: 'bars' | 'wave' | 'spiral' | 'burst';
}

export default function AudioVisualizer({ visualizationFilter = 'bars' }: AudioVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particleBufferRef = useRef<THREE.BufferAttribute>(null);
  const { currentSong, audioAnalyzer, visualizationFilter: activeFilter } = useMusicExplorer();
  const { isMuted } = useAudio();
  
  const particleCount = 200;
  const currentFilter = visualizationFilter || activeFilter;

  // Dynamic particles for audio visualization
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 5 + (i % 10);
      
      const x = Math.cos(angle) * radius;
      const y = (i % 20) - 10;
      const z = Math.sin(angle) * radius;
      
      positions[i * 3] = basePositions[i * 3] = x;
      positions[i * 3 + 1] = basePositions[i * 3 + 1] = y;
      positions[i * 3 + 2] = basePositions[i * 3 + 2] = z;
      
      // Bright fluorescent colors
      const colorIndex = i % 4;
      if (colorIndex === 0) {
        colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1; // Cyan
      } else if (colorIndex === 1) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 1; // Magenta
      } else if (colorIndex === 2) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0; // Yellow
      } else {
        colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0; // Green
      }
    }
    
    return { positions, colors, basePositions };
  }, []);

  // Dynamic frequency bars
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
        rotation: [0, angle, 0] as [number, number, number],
        baseHeight: 1,
        currentHeight: 1
      });
    }
    
    return bars;
  }, []);

  // Audio-reactive animations
  useFrame(() => {
    if (!audioAnalyzer || !currentSong || isMuted) return;

    const frequencyData = audioAnalyzer.getFrequencyData();
    const waveformData = audioAnalyzer.getWaveformData();
    
    if (!frequencyData || !waveformData) return;

    // Update particle positions based on audio
    for (let i = 0; i < particleCount; i++) {
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      
      const baseY = particles.basePositions[i * 3 + 1];
      particles.positions[i * 3 + 1] = baseY + normalizedAudio * 3;
    }
    
    // Update particle buffer
    if (particleBufferRef.current) {
      particleBufferRef.current.array = particles.positions;
      particleBufferRef.current.needsUpdate = true;
    }
    
    // Update frequency bars with visualization filters
    frequencyBars.forEach((bar, i) => {
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      
      switch (currentFilter) {
        case 'bars':
          bar.currentHeight = bar.baseHeight + normalizedAudio * 5;
          break;
        case 'wave':
          const wave = Math.sin((i / frequencyBars.length) * Math.PI * 4) * normalizedAudio;
          bar.currentHeight = bar.baseHeight + Math.abs(wave) * 3;
          break;
        case 'spiral':
          const spiral = Math.sin((i / frequencyBars.length) * Math.PI * 8 + Date.now() * 0.001);
          bar.currentHeight = bar.baseHeight + (spiral * normalizedAudio + normalizedAudio) * 2;
          break;
        case 'burst':
          const burst = normalizedAudio > 0.5 ? normalizedAudio * 8 : 0;
          bar.currentHeight = bar.baseHeight + burst;
          break;
        default:
          bar.currentHeight = bar.baseHeight + normalizedAudio * 5;
      }
    });
  });

  if (!currentSong) return null;

  return (
    <group ref={groupRef} position={[0, 5, 0]}>
      {/* Dynamic audio particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            ref={particleBufferRef}
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
          size={currentFilter === 'burst' ? 0.4 : 0.2}
          transparent
          opacity={currentFilter === 'wave' ? 0.9 : 0.8}
          vertexColors
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Dynamic frequency bars */}
      {frequencyBars.map((bar, index) => {
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
        const color = colors[index % colors.length];
        return (
          <mesh
            key={`bar-${index}`}
            position={bar.position}
            rotation={bar.rotation}
            scale={[1, bar.currentHeight, 1]}
            userData={{ isFrequencyBar: true, barIndex: index }}
          >
            <boxGeometry args={[0.3, 1, 0.3]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}