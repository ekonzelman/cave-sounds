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
  const { currentSong, audioAnalyzer, visualizationFilter: activeFilter, playerPosition, songNodes } = useMusicExplorer();
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

  // Simple frequency bars  
  const barRefs = useRef<THREE.Mesh[]>([]);
  const barCount = 16; // Further reduced for stability
  
  const frequencyBars = useMemo(() => {
    const bars = [];
    barRefs.current = [];
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 8; // Start farther out
      
      bars.push({
        position: [
          Math.cos(angle) * radius,
          6, // Start elevated
          Math.sin(angle) * radius
        ] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number],
        index: i
      });
    }
    
    return bars;
  }, []);

  // ORBITAL FREQUENCY BARS ANIMATION - ALWAYS VISIBLE AND MOVING
  useFrame((state) => {
    if (!audioAnalyzer || !currentSong || isMuted) return;

    const frequencyData = audioAnalyzer.getFrequencyData();
    if (!frequencyData) return;

    const currentTime = state.clock.elapsedTime;
    
    // Animate ALL frequency bars in a clear orbit
    for (let i = 0; i < barRefs.current.length; i++) {
      const barMesh = barRefs.current[i];
      if (!barMesh) continue;
      
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      
      // CLEAR ORBITAL MOTION around center of scene
      const baseAngle = (i / barCount) * Math.PI * 2 + currentTime * 1.2; // Fast rotation
      const radius = 15; // Large radius for visibility
      
      barMesh.position.x = Math.cos(baseAngle) * radius;
      barMesh.position.z = Math.sin(baseAngle) * radius;
      barMesh.position.y = 10; // High in the air
      
      // Audio scaling
      barMesh.scale.y = 1 + normalizedAudio * 4;
      
      // Bar rotation
      barMesh.rotation.y = currentTime * 3;
    }
  });

  if (!currentSong) return null;

  // Position the entire visualizer group above the currently playing song
  const currentSongData = songNodes && songNodes.find ? songNodes.find((s: any) => s.id === currentSong?.id) : null;
  const groupPosition: [number, number, number] = currentSongData ? 
    [currentSongData.position[0] || 0, (currentSongData.position[1] || 0) + 8, currentSongData.position[2] || 0] : 
    [0, 8, 0];

  return (
    <group ref={groupRef} position={groupPosition}>
      {/* Simplified particles - static for stability */}
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
          size={0.15}
          transparent
          opacity={0.6}
          vertexColors
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Frequency bars - ANIMATED AND ORBITING */}
      {frequencyBars.map((bar, index) => {
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
        const color = colors[index % colors.length];
        return (
          <mesh
            key={`bar-${index}`}
            ref={(el) => { if (el) barRefs.current[index] = el; }}
            position={[0, 0, 0]} // Start at origin, animation will move them
          >
            <boxGeometry args={[0.4, 4, 0.4]} />
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