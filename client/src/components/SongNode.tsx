import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
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
  const [hovered, setHovered] = useState(false);
  const { playerPosition, discoverSongNode, currentSong, setCurrentSong } = useMusicExplorer();
  const { playSuccess } = useAudio();

  // Calculate distance to player
  const distanceToPlayer = new THREE.Vector3(...position).distanceTo(
    new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z)
  );

  const isNearby = distanceToPlayer < 3;
  const isDiscovered = songData.discovered;

  useFrame((state) => {
    if (!meshRef.current) return;

    // Floating animation
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    
    // Rotation animation
    meshRef.current.rotation.y += 0.02;
    
    // Pulsing effect based on discovery state
    const scale = isDiscovered ? 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.2 : 0.8;
    meshRef.current.scale.setScalar(scale);

    // Text rotation to face camera
    if (textRef.current && isNearby && isDiscovered) {
      textRef.current.lookAt(state.camera.position);
    }
  });

  const handleClick = () => {
    if (!isDiscovered) {
      // Discover the node
      discoverSongNode(songData.id);
      playSuccess();
      console.log(`Discovered song: ${songData.title}`);
    } else {
      // Play the song - pass the full songData with position
      setCurrentSong(songData);
      console.log(`Playing song: ${songData.title}`);
    }
  };

  const getNodeColor = () => {
    if (!isDiscovered) return '#333333'; // Hidden/undiscovered
    if (currentSong?.id === songData.id) return '#ff0080'; // Currently playing - bright magenta
    if (hovered) return '#00ffff'; // Hovered - cyan
    return '#ffffff'; // Discovered but not playing - white
  };

  const getEmissiveColor = () => {
    if (!isDiscovered) return '#111111';
    if (currentSong?.id === songData.id) return '#ff0080';
    return '#ffffff';
  };

  return (
    <group position={position}>
      {/* Main song node - glowing orb */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={getNodeColor()}
          transparent
          opacity={isDiscovered ? 1 : 0.5}
        />
      </mesh>

      {/* Outer glow ring - fluorescent */}
      {isDiscovered && (
        <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[1.2, 1.8, 32]} />
          <meshBasicMaterial
            color={getNodeColor()}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Particle system around discovered nodes */}
      {isDiscovered && (
        <points>
          <sphereGeometry args={[3, 64, 64]} />
          <pointsMaterial
            color={getNodeColor()}
            size={0.08}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Song title text */}
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

      {/* Interaction hint */}
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

      {/* Discovery effect */}
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
