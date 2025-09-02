import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { useAudio } from '../lib/stores/useAudio';
import * as THREE from 'three';

interface AudioVisualizerProps {
  visualizationFilter?: 'bars' | 'wave' | 'spiral' | 'burst';
}

export default function AudioVisualizer({ visualizationFilter }: AudioVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particleBufferRef = useRef<THREE.BufferAttribute>(null);
  const { 
    currentSong, 
    audioAnalyzer, 
    visualizationFilter: storeFilter, 
    playerPosition, 
    songNodes,
    visualizationIntensity,
    isTransitioning,
    updateTransitionAnimation
  } = useMusicExplorer();
  const { isMuted } = useAudio();
  
  const particleCount = 1000; // Much more particles for dramatic effect
  const currentFilter = visualizationFilter || storeFilter;
  

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

  // ORBITAL FREQUENCY BARS ANIMATION - WITH SMOOTH TRANSITIONS
  useFrame((state, delta) => {
    // Update transition animation for smooth fade-in
    updateTransitionAnimation(delta);
    
    if (!audioAnalyzer || !currentSong || isMuted) return;

    const frequencyData = audioAnalyzer.getFrequencyData();
    if (!frequencyData) return;

    const currentTime = state.clock.elapsedTime;
    
    // Animate frequency bars based on the current visualization filter
    for (let i = 0; i < barRefs.current.length; i++) {
      const barMesh = barRefs.current[i];
      if (!barMesh) continue;
      
      const audioValue = frequencyData[i % frequencyData.length] || 0;
      const normalizedAudio = audioValue / 255;
      
      // Apply different animations based on currentFilter
      switch (currentFilter) {
        case 'wave':
          // Wave Motion - bars move in undulating wave pattern
          const waveOffset = Math.sin(currentTime * 2 + i * 0.3) * 8;
          const waveScale = 1 + normalizedAudio * 12;
          const waveAngle = (i / barCount) * Math.PI * 2;
          const waveRadius = 25 + Math.sin(currentTime * 0.5 + i * 0.1) * 5;
          
          barMesh.position.x = Math.cos(waveAngle) * waveRadius;
          barMesh.position.z = Math.sin(waveAngle) * waveRadius;
          barMesh.position.y = 12 + waveOffset;
          barMesh.scale.y = waveScale * visualizationIntensity;
          barMesh.scale.x = barMesh.scale.z = visualizationIntensity;
          barMesh.rotation.y = currentTime * 1.5;
          break;
          
        case 'spiral':
          // Spiral Dance - bars form expanding spiral
          const spiralRadius = 15 + normalizedAudio * 25 + Math.sin(currentTime * 0.8) * 10;
          const spiralAngle = (i / barCount) * Math.PI * 4 + currentTime * 2;
          const spiralHeight = 10 + i * 0.5 + Math.sin(currentTime * 3 + i * 0.2) * 6;
          
          barMesh.position.x = Math.cos(spiralAngle) * spiralRadius;
          barMesh.position.z = Math.sin(spiralAngle) * spiralRadius;
          barMesh.position.y = spiralHeight;
          barMesh.scale.y = (2 + normalizedAudio * 18) * visualizationIntensity;
          barMesh.scale.x = barMesh.scale.z = visualizationIntensity;
          barMesh.rotation.y = spiralAngle;
          break;
          
        case 'burst':
          // Energy Burst - bars explode outward from center
          const burstRadius = 10 + normalizedAudio * 35;
          const burstIntensity = normalizedAudio * 20;
          const burstAngle = (i / barCount) * Math.PI * 2 + Math.sin(currentTime * 4) * 0.5;
          
          barMesh.position.x = Math.cos(burstAngle) * burstRadius;
          barMesh.position.z = Math.sin(burstAngle) * burstRadius;
          barMesh.position.y = 15 + burstIntensity * Math.sin(currentTime * 6 + i * 0.4);
          barMesh.scale.y = (3 + burstIntensity) * visualizationIntensity;
          barMesh.scale.x = barMesh.scale.z = (1 + normalizedAudio * 2) * visualizationIntensity;
          barMesh.rotation.y = currentTime * 4 + i * 0.5;
          barMesh.rotation.x = Math.sin(currentTime * 3 + i * 0.3) * 0.3;
          break;
          
        case 'bars':
        default:
          // Frequency Bars - classic orbital motion
          const baseAngle = (i / barCount) * Math.PI * 2 + currentTime * 1.5;
          const radius = 40 + normalizedAudio * 20;
          
          barMesh.position.x = Math.cos(baseAngle) * radius;
          barMesh.position.z = Math.sin(baseAngle) * radius;
          barMesh.position.y = 15 + Math.sin(currentTime + i * 0.3) * 10;
          barMesh.scale.y = (2 + normalizedAudio * 15) * visualizationIntensity;
          barMesh.scale.x = barMesh.scale.z = visualizationIntensity;
          barMesh.rotation.y = currentTime * 3;
          break;
      }
      
      // Apply smooth opacity fade-in via material
      if (barMesh.material instanceof THREE.MeshBasicMaterial) {
        barMesh.material.opacity = visualizationIntensity;
        barMesh.material.transparent = true;
      }
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
          size={(currentSong ? 0.5 : 0.15) * visualizationIntensity} // Much larger when music is playing, with smooth fade-in
          transparent
          opacity={(currentSong ? 0.9 : 0.6) * visualizationIntensity}
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
              opacity={0.9 * visualizationIntensity}
            />
          </mesh>
        );
      })}
    </group>
  );
}