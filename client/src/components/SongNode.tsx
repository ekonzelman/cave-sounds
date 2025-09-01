import React, { useRef, useState, useMemo } from 'react';
import { Text, Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { useAudio } from '../lib/stores/useAudio';
import * as THREE from 'three';

interface SongNodeProps {
  position: [number, number, number];
  songData: {
    id: string;
    title: string;
    filename: string;
    discovered: boolean;
  };
}

export default function SongNode({ position, songData }: SongNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const frequencyBarRefs = useRef<THREE.Mesh[]>([]);
  const [hovered, setHovered] = useState(false);
  const { playerPosition, discoverSongNode, currentSong, setCurrentSong, audioAnalyzer } = useMusicExplorer();
  const { playSuccess } = useAudio();

  // Frequency bars around this song node
  const frequencyBars = useMemo(() => {
    const bars = [];
    const barCount = 12;
    frequencyBarRefs.current = [];
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 4; // Close to the song node
      
      bars.push({
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number],
        index: i
      });
    }
    
    return bars;
  }, []);

  // Calculate distance to player
  const distanceToPlayer = new THREE.Vector3(...position).distanceTo(
    new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z)
  );

  const isNearby = distanceToPlayer < 3;
  const isDiscovered = songData.discovered;
  const isCurrentlyPlaying = currentSong?.id === songData.id;
  const { visualizationFilter } = useMusicExplorer();

  // Add animations when music is playing
  useFrame((state) => {
    if (!meshRef.current || !outerRingRef.current) return;
    
    // Only animate if this song is currently playing
    if (isCurrentlyPlaying && audioAnalyzer) {
      const frequencyData = audioAnalyzer.getFrequencyData();
      if (frequencyData) {
        // Get audio intensity for pulsing effect
        const avgFrequency = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
        const normalizedAudio = avgFrequency / 255;
        
        // Pulse the main sphere based on audio
        const pulseScale = 1 + normalizedAudio * 0.3;
        meshRef.current.scale.setScalar(pulseScale);
        
        // Rotate the outer ring
        outerRingRef.current.rotation.z += 0.02;
        
        // Additional pulsing for the ring
        const ringScale = 1 + normalizedAudio * 0.2;
        outerRingRef.current.scale.setScalar(ringScale);
        
        // ANIMATE FREQUENCY BARS with different visualization modes
        const currentTime = state.clock.elapsedTime;
        
        for (let i = 0; i < frequencyBarRefs.current.length; i++) {
          const barMesh = frequencyBarRefs.current[i];
          if (!barMesh) continue;
          
          const audioValue = frequencyData[i % frequencyData.length] || 0;
          const barNormalizedAudio = audioValue / 255;
          
          // Different animations based on visualization mode
          switch (visualizationFilter) {
            case 'wave':
              // Wave motion - bars move in a sine wave pattern
              const waveOffset = Math.sin((i / 12) * Math.PI * 2 + currentTime * 2) * 0.5;
              const waveScale = 0.3 + barNormalizedAudio * 2 + Math.abs(waveOffset);
              barMesh.scale.y = waveScale;
              barMesh.position.y = waveOffset;
              break;
              
            case 'spiral':
              // Spiral dance - bars rotate and pulse in a spiral
              const spiralAngle = (i / 12) * Math.PI * 2 + currentTime;
              const spiralRadius = 4 + Math.sin(currentTime + i * 0.2) * 0.5;
              barMesh.position.x = Math.cos(spiralAngle) * spiralRadius;
              barMesh.position.z = Math.sin(spiralAngle) * spiralRadius;
              barMesh.scale.y = 0.3 + barNormalizedAudio * 3;
              barMesh.rotation.y = spiralAngle;
              break;
              
            case 'burst':
              // Energy burst - bars explode outward with high frequencies
              const burstIntensity = barNormalizedAudio > 0.6 ? barNormalizedAudio * 2 : 0.3;
              const burstRadius = 4 + burstIntensity * 2;
              const burstAngle = (i / 12) * Math.PI * 2;
              barMesh.position.x = Math.cos(burstAngle) * burstRadius;
              barMesh.position.z = Math.sin(burstAngle) * burstRadius;
              barMesh.scale.y = 0.2 + burstIntensity * 4;
              barMesh.scale.x = barMesh.scale.z = 1 + burstIntensity;
              break;
              
            default: // 'bars'
              // Standard frequency bars
              const scaleY = 0.3 + barNormalizedAudio * 3;
              barMesh.scale.y = scaleY;
              // Reset position and scale
              barMesh.position.x = Math.cos((i / 12) * Math.PI * 2) * 4;
              barMesh.position.z = Math.sin((i / 12) * Math.PI * 2) * 4;
              barMesh.position.y = 0;
              barMesh.scale.x = barMesh.scale.z = 1;
              barMesh.rotation.y = 0;
          }
        }
      }
    } else {
      // Reset to normal size when not playing
      meshRef.current.scale.setScalar(1);
      if (outerRingRef.current) {
        outerRingRef.current.scale.setScalar(1);
      }
      // Reset frequency bars
      for (let i = 0; i < frequencyBarRefs.current.length; i++) {
        const barMesh = frequencyBarRefs.current[i];
        if (barMesh) barMesh.scale.y = 0.3;
      }
    }
  });

  const handleClick = () => {
    if (!isDiscovered) {
      // Discover the node
      discoverSongNode(songData.id);
      playSuccess();
      console.log(`Discovered song: ${songData.title}`);
    } else {
      // Play the song - pass the full songData 
      setCurrentSong({ ...songData, position });
      console.log(`Playing song: ${songData.title}`);
    }
  };

  const getNodeColor = () => {
    if (!isDiscovered) return '#0099ff'; // Undiscovered - bright blue glow
    if (currentSong?.id === songData.id) return '#ff0080'; // Currently playing - bright magenta
    if (hovered) return '#00ffff'; // Hovered - cyan
    return '#ffffff'; // Discovered but not playing - white
  };

  const getEmissiveColor = () => {
    if (!isDiscovered) return '#0066cc';
    if (currentSong?.id === songData.id) return '#ff0080';
    return '#ffffff';
  };

  return (
    <group position={position}>
      {/* Main song node - completely static glowing orb */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial
          color={getNodeColor()}
          transparent
          opacity={isDiscovered ? 1 : 0.9}
        />
      </mesh>

      {/* Outer glow ring - animated when playing */}
      <mesh ref={outerRingRef} position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[2, 3.5, 32]} />
        <meshBasicMaterial
          color={getNodeColor()}
          transparent
          opacity={isDiscovered ? 0.8 : 0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Particle system around all nodes - static */}
      <points>
        <sphereGeometry args={[4, 64, 64]} />
        <pointsMaterial
          color={getNodeColor()}
          size={0.12}
          transparent
          opacity={isDiscovered ? 0.8 : 0.5}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Extra bright beacon for undiscovered nodes - static */}
      {!isDiscovered && (
        <pointLight
          position={[0, 0, 0]}
          intensity={8}
          distance={15}
          color={getNodeColor()}
        />
      )}

      {/* Song title text - static */}
      {isNearby && isDiscovered && (
        <Text
          ref={textRef}
          position={[0, 2, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="black"
        >
          {songData.title}
        </Text>
      )}

      {/* Interaction hint - static */}
      {isNearby && (
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.3}
          color={isDiscovered ? "#4ecdc4" : "#888888"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="black"
        >
          {isDiscovered ? "Press E to play" : "Press E to discover"}
        </Text>
      )}


      {/* Discovery effect - static */}
      {!isDiscovered && isNearby && (
        <mesh>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial
            color="#888888"
            wireframe
            transparent
            opacity={0.2}
          />
        </mesh>
      )}
    </group>
  );
}