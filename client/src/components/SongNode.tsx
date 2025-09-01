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
  const { playerPosition, discoverSongNode, currentSong, togglePlayPause, audioAnalyzer, isPaused, visualizationFilter } = useMusicExplorer();
  const { playSuccess } = useAudio();

  // DRAMATIC frequency bars around this song node - much larger scale
  const frequencyBars = useMemo(() => {
    const bars = [];
    const barCount = 24; // More bars for better visualization
    frequencyBarRefs.current = [];
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 8; // Much larger radius to take up more space
      
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
              // DRAMATIC Wave motion - massive bars in wave pattern
              try {
                const waveOffset = Math.sin((i / 24) * Math.PI * 2 + currentTime * 2) * 3; // Much larger wave motion
                const waveScale = Math.max(1, Math.min(15, 2 + barNormalizedAudio * 8 + Math.abs(waveOffset)));
                
                if (isFinite(waveOffset) && isFinite(waveScale)) {
                  barMesh.scale.y = waveScale;
                  barMesh.position.y = waveOffset;
                  // Reset other positions to larger circle
                  const baseAngle = (i / 24) * Math.PI * 2;
                  barMesh.position.x = Math.cos(baseAngle) * 8;
                  barMesh.position.z = Math.sin(baseAngle) * 8;
                  barMesh.rotation.y = 0;
                }
              } catch (error) {
                console.warn('Wave animation error:', error);
                barMesh.scale.y = 2 + barNormalizedAudio * 8;
                barMesh.position.y = 0;
              }
              break;
              
            case 'spiral':
              // DRAMATIC Spiral dance - massive rotating spiral
              try {
                const spiralAngle = (i / 24) * Math.PI * 2 + currentTime * 0.8;
                const spiralRadius = Math.max(6, 12 + Math.sin(currentTime * 1.2 + i * 0.2) * 6); // Much larger spiral
                const safeX = Math.cos(spiralAngle) * spiralRadius;
                const safeZ = Math.sin(spiralAngle) * spiralRadius;
                
                // Ensure values are finite
                if (isFinite(safeX) && isFinite(safeZ) && isFinite(spiralAngle)) {
                  barMesh.position.x = safeX;
                  barMesh.position.z = safeZ;
                  barMesh.position.y = Math.sin(currentTime + i * 0.2) * 4; // Bigger vertical movement
                  barMesh.scale.y = Math.max(1.5, 3 + barNormalizedAudio * 12); // Much taller bars
                  barMesh.rotation.y = spiralAngle * 0.7;
                }
              } catch (error) {
                console.warn('Spiral animation error:', error);
                // Fallback to default position
                barMesh.scale.y = 3 + barNormalizedAudio * 12;
              }
              break;
              
            case 'burst':
              // DRAMATIC Energy burst - massive explosion effect
              try {
                const burstIntensity = Math.max(0.5, barNormalizedAudio > 0.4 ? barNormalizedAudio * 3 : 1);
                const burstRadius = Math.max(8, Math.min(25, 12 + burstIntensity * 8)); // Much larger burst range
                const burstAngle = (i / 24) * Math.PI * 2;
                const burstX = Math.cos(burstAngle) * burstRadius;
                const burstZ = Math.sin(burstAngle) * burstRadius;
                
                if (isFinite(burstX) && isFinite(burstZ) && isFinite(burstIntensity)) {
                  barMesh.position.x = burstX;
                  barMesh.position.z = burstZ;
                  barMesh.position.y = Math.sin(currentTime + i * 0.3) * 2;
                  barMesh.scale.y = Math.max(2, Math.min(20, 4 + burstIntensity * 12)); // Much taller bars
                  barMesh.scale.x = barMesh.scale.z = Math.max(1, Math.min(4, 1.5 + burstIntensity * 2));
                }
              } catch (error) {
                console.warn('Burst animation error:', error);
                // Fallback to default
                barMesh.scale.y = 4 + barNormalizedAudio * 12;
                barMesh.scale.x = barMesh.scale.z = 1.5;
              }
              break;
              
            default: // 'bars'
              // DRAMATIC Standard frequency bars - much larger
              const scaleY = 2 + barNormalizedAudio * 15; // Much taller bars
              barMesh.scale.y = scaleY;
              // Reset position and scale to larger circle
              barMesh.position.x = Math.cos((i / 24) * Math.PI * 2) * 8;
              barMesh.position.z = Math.sin((i / 24) * Math.PI * 2) * 8;
              barMesh.position.y = 0;
              barMesh.scale.x = barMesh.scale.z = 1.5 + barNormalizedAudio * 2; // Thicker bars
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
    // Simple click handler - no event conflicts since pointer lock uses Enter key
    try {
      if (!isDiscovered) {
        // Discover the node
        discoverSongNode(songData.id);
        playSuccess();
        console.log(`Discovered song: ${songData.title}`);
      } else {
        // Use toggle play/pause for discovered songs
        togglePlayPause({ ...songData, position });
        const action = currentSong?.id === songData.id && !isPaused ? 'Paused' : 'Playing';
        console.log(`${action} song: ${songData.title}`);
      }
    } catch (error) {
      console.error('Song node interaction error:', error);
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

      {/* DRAMATIC Frequency bars around song node - much larger and colorful */}
      {isCurrentlyPlaying && frequencyBars.map((bar, index) => {
        // Dynamic rainbow colors that cycle with time and audio
        const time = Date.now() * 0.003;
        const hue = (time * 60 + index * 15) % 360;
        const color = `hsl(${hue}, 100%, 65%)`;
        
        return (
          <mesh
            key={`freq-bar-${index}`}
            ref={(el) => { if (el) frequencyBarRefs.current[index] = el; }}
            position={bar.position}
            rotation={bar.rotation}
          >
            <boxGeometry args={[0.8, 3, 0.8]} /> {/* Much thicker and taller bars */}
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.9}
            />
          </mesh>
        );
      })}

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