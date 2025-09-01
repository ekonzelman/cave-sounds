import React, { useRef, useMemo, useEffect } from 'react';
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

  // Frequency bars with refs for animation
  const frequencyBars = useMemo(() => {
    const bars = [];
    const barCount = 32; // Reduced for better performance
    
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
        currentHeight: 1,
        ref: React.createRef<THREE.Mesh>()
      });
    }
    
    return bars;
  }, []);

  // Audio-reactive animations with debugging
  useFrame(() => {
    if (!audioAnalyzer || !currentSong || isMuted) return;

    const frequencyData = audioAnalyzer.getFrequencyData();
    const waveformData = audioAnalyzer.getWaveformData();
    
    if (!frequencyData || !waveformData) {
      console.log('No audio data available');
      return;
    }
    
    // Debug audio data flow
    const avgFrequency = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
    if (avgFrequency > 10) {
      console.log('Audio data flowing - avg frequency:', avgFrequency);
    }

    // Update particle positions based on audio
    for (let i = 0; i < particleCount; i++) {
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      
      const baseY = particles.basePositions[i * 3 + 1];
      particles.positions[i * 3 + 1] = baseY + normalizedAudio * 3;
    }
    
    // Update particle buffer with proper array assignment
    if (particleBufferRef.current) {
      const bufferArray = particleBufferRef.current.array as Float32Array;
      for (let i = 0; i < particles.positions.length; i++) {
        bufferArray[i] = particles.positions[i];
      }
      particleBufferRef.current.needsUpdate = true;
    }
    
    // Update frequency bars with direct mesh scale manipulation
    frequencyBars.forEach((bar, i) => {
      if (!bar.ref.current) return;
      
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      let scaleY = 1;
      
      switch (currentFilter) {
        case 'bars':
          scaleY = 1 + normalizedAudio * 4;
          break;
        case 'wave':
          const wave = Math.sin((i / frequencyBars.length) * Math.PI * 4) * normalizedAudio;
          scaleY = 1 + Math.abs(wave) * 3;
          break;
        case 'spiral':
          const spiral = Math.sin((i / frequencyBars.length) * Math.PI * 8 + Date.now() * 0.001);
          scaleY = 1 + (Math.abs(spiral) * normalizedAudio + normalizedAudio) * 2;
          break;
        case 'burst':
          const burst = normalizedAudio > 0.4 ? normalizedAudio * 6 : 0.5;
          scaleY = 1 + burst;
          break;
        default:
          scaleY = 1 + normalizedAudio * 4;
      }
      
      // Apply the scale directly to the mesh
      bar.ref.current.scale.set(1, Math.max(0.1, scaleY), 1);
      bar.currentHeight = scaleY;
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
            ref={bar.ref}
            position={bar.position}
            rotation={bar.rotation}
            userData={{ isFrequencyBar: true, barIndex: index }}
          >
            <boxGeometry args={[0.4, 2, 0.4]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}