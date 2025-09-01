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
  const { currentSong, audioAnalyzer, visualizationFilter: activeFilter, playerPosition, songs } = useMusicExplorer();
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
      const radius = 6;
      
      bars.push({
        position: [
          Math.cos(angle) * radius,
          1, // Slightly elevated
          Math.sin(angle) * radius
        ] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number],
        index: i
      });
    }
    
    return bars;
  }, []);

  // Global frequency bars positioned above the currently playing song node
  useFrame((state) => {
    if (!audioAnalyzer || !currentSong || isMuted) return;

    const frequencyData = audioAnalyzer.getFrequencyData();
    if (!frequencyData) return;

    const currentTime = state.clock.elapsedTime;
    
    // Find the position of the currently playing song node
    const currentSongData = songs.find(s => s.id === currentSong.id);
    const songNodePosition = currentSongData ? {
      x: currentSongData.x || 0,
      y: currentSongData.y || 0, 
      z: currentSongData.z || 0
    } : { x: 0, y: 0, z: 0 };
    
    // Update frequency bars positioned above the song node
    for (let i = 0; i < barRefs.current.length; i++) {
      const barMesh = barRefs.current[i];
      if (!barMesh) continue;
      
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      
      // Position bars in a circle above the currently playing song node
      const baseAngle = (i / barCount) * Math.PI * 2 + currentTime * 0.5;
      const radius = 8; // Wider circle for visibility
      const targetX = songNodePosition.x + Math.cos(baseAngle) * radius;
      const targetZ = songNodePosition.z + Math.sin(baseAngle) * radius;
      const targetY = songNodePosition.y + 6; // Elevated above the song node
      
      // Smooth movement to target position
      barMesh.position.x += (targetX - barMesh.position.x) * 0.05;
      barMesh.position.z += (targetZ - barMesh.position.z) * 0.05;
      barMesh.position.y += (targetY - barMesh.position.y) * 0.05;
      
      // Audio-reactive scaling
      const scaleY = 0.5 + normalizedAudio * 3;
      barMesh.scale.y = scaleY;
    }
  });

  if (!currentSong) return null;

  // Position the entire visualizer group above the currently playing song
  const currentSongData = songs.find(s => s.id === currentSong?.id);
  const groupPosition: [number, number, number] = currentSongData ? 
    [currentSongData.x || 0, (currentSongData.y || 0) + 8, currentSongData.z || 0] : 
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

      {/* Frequency bars - simplified and working */}
      {frequencyBars.map((bar, index) => {
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
        const color = colors[index % colors.length];
        return (
          <mesh
            key={`bar-${index}`}
            ref={(el) => { if (el) barRefs.current[index] = el; }}
            position={bar.position}
            rotation={bar.rotation}
          >
            <boxGeometry args={[0.3, 2, 0.3]} />
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