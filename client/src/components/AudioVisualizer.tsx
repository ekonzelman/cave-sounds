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
  
  const particleCount = 1000; // Much more particles for dramatic effect
  const currentFilter = visualizationFilter || activeFilter;

  // Dynamic particles for audio visualization
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 4; // More spiral distribution
      const radius = 15 + (i % 30); // Much larger spread
      
      const x = Math.cos(angle) * radius;
      const y = (i % 40) - 20; // Taller distribution
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
  const barCount = 32; // More bars for better visualization
  
  const frequencyBars = useMemo(() => {
    const bars = [];
    barRefs.current = [];
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 20 + (i % 5) * 5; // Much farther out with variation
      
      bars.push({
        position: [
          Math.cos(angle) * radius,
          10 + (i % 3) * 2, // Higher and varied elevation
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
      
      // DRAMATIC ORBITAL MOTION - much larger scale
      const baseAngle = (i / barCount) * Math.PI * 2 + currentTime * 1.5; // Faster rotation
      const radius = 40 + normalizedAudio * 20; // Much larger radius that responds to audio
      
      barMesh.position.x = Math.cos(baseAngle) * radius;
      barMesh.position.z = Math.sin(baseAngle) * radius;
      barMesh.position.y = 15 + Math.sin(currentTime + i * 0.3) * 10; // Higher and dancing in air
      
      // DRAMATIC Audio scaling - much taller bars
      barMesh.scale.y = 2 + normalizedAudio * 15;
      
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
          size={currentSong ? 0.5 : 0.15} // Much larger when music is playing
          transparent
          opacity={currentSong ? 0.9 : 0.6}
          vertexColors
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* DRAMATIC FREQUENCY BARS - Much larger and more colorful */}
      {frequencyBars.map((bar, index) => {
        // Dynamic rainbow colors that cycle with time
        const time = Date.now() * 0.002;
        const hue = (time * 50 + index * 11.25) % 360; // 360/32 = 11.25 degrees per bar
        const color = `hsl(${hue}, 100%, 60%)`;
        
        return (
          <mesh
            key={`bar-${index}`}
            ref={(el) => { if (el) barRefs.current[index] = el; }}
            position={[0, 0, 0]} // Start at origin, animation will move them
          >
            <boxGeometry args={[1.5, 6, 1.5]} /> {/* Much thicker and taller bars */}
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