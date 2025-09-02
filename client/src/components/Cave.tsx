import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import SongNode from './SongNode';
import * as THREE from 'three';
import type { CaveObjectNode } from '../../../shared/schema';

export default function Cave() {
  const caveRef = useRef<THREE.Group>(null);
  const pointsRefs = useRef<THREE.Points[]>([]);
  const stalactiteRefs = useRef<THREE.Mesh[]>([]);
  const customObjectRefs = useRef<THREE.Mesh[]>([]);
  const { songNodes, currentSong, audioAnalyzer, visualizationIntensity } = useMusicExplorer();
  const { camera } = useThree();
  const [revealedLayers, setRevealedLayers] = useState<number>(1);
  const [caveObjects, setCaveObjects] = useState<CaveObjectNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch custom cave objects from database
  useEffect(() => {
    const fetchCaveObjects = async () => {
      try {
        const response = await fetch('/api/cave-objects');
        if (response.ok) {
          const objects = await response.json();
          console.log('Fetched cave objects:', objects.length, objects);
          setCaveObjects(objects);
        } else {
          console.error('Failed to fetch cave objects:', response.status);
        }
      } catch (error) {
        console.error('Error fetching cave objects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCaveObjects();
    
    // Poll for changes every 5 seconds
    const interval = setInterval(fetchCaveObjects, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle clicks to reveal new layers
  const handleClick = () => {
    setRevealedLayers(prev => Math.min(prev + 1, 5));
  };
  
  // AUDIO-REACTIVE Cave atmosphere lighting
  const [audioReactiveColors, setAudioReactiveColors] = useState({
    ambient: '#2c1810',
    directional: '#4a3728',
    mineral: '#1a5490'
  });
  
  // AUDIO-REACTIVE Reference object colors
  const [referenceObjectColors, setReferenceObjectColors] = useState({
    lightSource: {
      core: '#ffffff',
      emissive: '#ffff88',
      lightColor: '#ffff88',
      intensity: 3
    },
    blackHole: {
      core: '#000000',
      accretion: ['#8b5fbf', '#5d4e75', '#2d1b3d'],
      lightColor: '#4a148c',
      intensity: 0.5
    }
  });
  
  // Update lighting colors and reference objects based on audio
  useFrame(() => {
    if (currentSong && audioAnalyzer) {
      const frequencyData = audioAnalyzer.getFrequencyData();
      if (frequencyData) {
        const avgFrequency = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
        const normalizedAudio = avgFrequency / 255;
        const time = Date.now() * 0.001;
        
        // Dynamic color cycling based on audio for cave atmosphere
        const hue = (time * 30 + normalizedAudio * 60) % 360;
        setAudioReactiveColors({
          ambient: `hsl(${hue}, 70%, 20%)`,
          directional: `hsl(${(hue + 120) % 360}, 80%, 40%)`,
          mineral: `hsl(${(hue + 240) % 360}, 90%, 60%)`
        });
        
        // LIGHT SOURCE - Bright pulsing colors
        const lightHue = (time * 60 + normalizedAudio * 180) % 360;
        const lightIntensity = 3 + normalizedAudio * 4; // 3-7 intensity range
        const brightColors = [
          `hsl(${lightHue}, 100%, 80%)`, // Bright saturated
          `hsl(${(lightHue + 90) % 360}, 90%, 85%)`, // Bright shifted
          '#00ffff', // Cyan
          '#ffff00', // Yellow
          '#ffffff', // White
          '#ff00ff'  // Magenta
        ];
        const lightColorIndex = Math.floor((time * 2 + normalizedAudio * 3) % brightColors.length);
        const selectedLightColor = brightColors[lightColorIndex];
        
        // BLACK HOLE - Dark pulsing colors
        const darkHue = (time * 40 + normalizedAudio * 120) % 360;
        const darkIntensity = 0.5 + normalizedAudio * 1.5; // 0.5-2 intensity range
        const darkColors = [
          `hsl(${darkHue + 270}, 80%, 15%)`, // Deep purple
          `hsl(${darkHue + 240}, 90%, 10%)`, // Deep blue
          `hsl(${darkHue + 300}, 70%, 8%)`,  // Deep magenta
          '#1a0033', // Very dark purple
          '#000066', // Very dark blue
          '#330066'  // Dark violet
        ];
        const darkColorIndex = Math.floor((time * 1.5 + normalizedAudio * 2) % darkColors.length);
        const selectedDarkColor = darkColors[darkColorIndex];
        
        setReferenceObjectColors({
          lightSource: {
            core: selectedLightColor,
            emissive: selectedLightColor,
            lightColor: selectedLightColor,
            intensity: lightIntensity
          },
          blackHole: {
            core: '#000000',
            accretion: [
              selectedDarkColor,
              `hsl(${darkHue + 280}, 70%, 20%)`,
              `hsl(${darkHue + 260}, 60%, 12%)`
            ],
            lightColor: selectedDarkColor,
            intensity: darkIntensity
          }
        });
      }
    } else {
      // Reset to default colors when no music is playing
      setAudioReactiveColors({
        ambient: '#2c1810',
        directional: '#4a3728',
        mineral: '#1a5490'
      });
      
      setReferenceObjectColors({
        lightSource: {
          core: '#ffffff',
          emissive: '#ffff88',
          lightColor: '#ffff88',
          intensity: 3
        },
        blackHole: {
          core: '#000000',
          accretion: ['#8b5fbf', '#5d4e75', '#2d1b3d'],
          lightColor: '#4a148c',
          intensity: 0.5
        }
      });
    }
  });
  
  const caveAmbientLight = useMemo(() => {
    return (
      <>
        {/* Audio-reactive ambient cave lighting */}
        <ambientLight intensity={currentSong ? 0.3 : 0.1} color={audioReactiveColors.ambient} />
        {/* Audio-reactive directional light from cave entrance */}
        <directionalLight
          position={[10, 20, 10]}
          intensity={currentSong ? 0.8 : 0.3}
          color={audioReactiveColors.directional}
        />
        {/* Audio-reactive underground mineral glow */}
        <pointLight
          position={[0, -5, 0]}
          intensity={currentSong ? 2 : 0.5}
          distance={currentSong ? 100 : 50}
          color={audioReactiveColors.mineral}
        />
      </>
    );
  }, [audioReactiveColors, currentSong]);

  // Generate point cloud cave layers
  const caveLayers = useMemo(() => {
    const layers = [];
    
    for (let layerIndex = 0; layerIndex < 5; layerIndex++) {
      const layerPoints = [];
      const particleCount = 3000 + layerIndex * 1000;
      
      // Create stable cave-like point distribution
      for (let i = 0; i < particleCount; i++) {
        // Generate stable cave-like structure 
        const angle = (i / particleCount) * Math.PI * 4;
        const radius = 15 + (layerIndex * 10);
        const height = (i % 15);
        
        // Create stable organic cave shapes
        const noise = Math.sin(angle * 3) * Math.cos(height * 0.1) * 1;
        const caveRadius = radius + noise;
        
        const x = Math.cos(angle) * caveRadius;
        const y = height - 2 + Math.sin(i * 0.01) * 1; // Reduced noise
        const z = Math.sin(angle) * caveRadius;
        
        // Add stable cave features
        if (i % 5 === 0) {
          const stalactiteHeight = i % 2 === 0 ? 12 : -2;
          layerPoints.push(x, stalactiteHeight, z);
        } else {
          layerPoints.push(x, y, z);
        }
      }
      
      layers.push(new Float32Array(layerPoints));
    }
    
    return layers;
  }, []);

  // Floating fluorescent particles for atmosphere
  const floatingParticles = useMemo(() => {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = ((i % 100) - 50) * 3;
      positions[i * 3 + 1] = (i % 20);
      positions[i * 3 + 2] = ((i % 100) - 50) * 3;
      
      // Fluorescent colors
      const colorChoice = i % 4;
      switch (colorChoice) {
        case 0: // Cyan
          colors[i * 3] = 0;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 1;
          break;
        case 1: // Magenta
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 0;
          colors[i * 3 + 2] = 1;
          break;
        case 2: // Yellow
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 0;
          break;
        default: // White
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 1;
      }
    }
    
    return { positions, colors };
  }, []);

  // Completely removed all animations to prevent any shaking or movement

  return (
    <group ref={caveRef} onClick={handleClick}>
      {/* Cave atmosphere lighting */}
      {caveAmbientLight}
      
      {/* Point cloud cave layers */}
      {caveLayers.slice(0, revealedLayers).map((layerPoints, layerIndex) => (
        <points key={`layer-${layerIndex}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={layerPoints}
              count={layerPoints.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={currentSong ? audioReactiveColors.mineral : "#ffffff"}
            size={currentSong ? 0.05 + layerIndex * 0.02 : 0.02 + layerIndex * 0.01}
            transparent
            opacity={currentSong ? 0.9 : 0.8 - layerIndex * 0.1}
            vertexColors={false}
          />
        </points>
      ))}

      {/* Static fluorescent particles */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={floatingParticles.positions}
            count={floatingParticles.positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={floatingParticles.colors}
            count={floatingParticles.colors.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          transparent
          opacity={0.9}
          vertexColors
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Song nodes */}
      {songNodes.map((node) => (
        <SongNode
          key={node.id}
          position={node.position}
          songData={node}
        />
      ))}

      {/* Custom cave objects from admin panel */}
      {!isLoading && caveObjects.length > 0 && caveObjects.map((obj) => {
        console.log('Rendering cave object:', obj.id, obj.objectType, 'at position:', obj.position, 'scale:', obj.scale, 'color:', obj.color);
        return (
          <group key={obj.id} position={obj.position} scale={obj.scale} rotation={obj.rotation || [0, 0, 0]}>
            <mesh>
              {/* Render different geometries based on object type */}
              {obj.objectType === 'stalactite' && (
                <coneGeometry args={[0.5, 3, 8]} />
              )}
              {obj.objectType === 'stalagmite' && (
                <coneGeometry args={[0.8, 2, 8]} />
              )}
              {obj.objectType === 'crystal' && (
                <octahedronGeometry args={[0.7]} />
              )}
              {obj.objectType === 'flowstone' && (
                <boxGeometry args={[1.5, 0.3, 1]} />
              )}
              {obj.objectType === 'particle_system' && (
                <sphereGeometry args={[0.1, 8, 8]} />
              )}
              
              <meshStandardMaterial
                color={obj.color}
                transparent
                opacity={obj.opacity}
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>
            
            {/* Add glow effect for crystals */}
            {obj.objectType === 'crystal' && (
              <pointLight
                position={[0, 0, 0]}
                color={obj.color}
                intensity={currentSong ? 2 : 0.5}
                distance={10}
              />
            )}
            
            {/* Add a visible marker for debugging */}
            <mesh position={[0, 2, 0]}>
              <sphereGeometry args={[0.1]} />
              <meshBasicMaterial color="#ff0000" />
            </mesh>
          </group>
        );
      })}

      {/* Realistic Stalactites - hanging from ceiling */}
      {[...Array(15)].map((_, i) => {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 25;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 4;
        
        return (
          <group key={`stalactite-${i}`} position={[x, 15, z]}>
            {/* Main stalactite body */}
            <mesh>
              <coneGeometry args={[0.5, height, 8]} />
              <meshBasicMaterial
                color={currentSong ? `hsl(${((Date.now() * 0.05 + i * 30) % 360)}, 60%, 70%)` : "#e6d7c3"}
                transparent
                opacity={currentSong ? 1.0 : 0.9}
              />
            </mesh>
            {/* Mineral deposits */}
            <mesh position={[0, -height/2, 0]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshBasicMaterial
                color="hsl(200, 70%, 70%)"
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Realistic Stalagmites - rising from floor */}
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 30;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 3;
        
        return (
          <group key={`stalagmite-${i}`} position={[x, -2, z]}>
            {/* Main stalagmite body */}
            <mesh>
              <coneGeometry args={[0.6, height, 8]} />
              <meshBasicMaterial
                color={currentSong ? `hsl(${((Date.now() * 0.03 + i * 45) % 360)}, 70%, 60%)` : "#d4c4a0"}
                transparent
                opacity={currentSong ? 1.0 : 0.9}
              />
            </mesh>
            {/* Colorful mineral veins */}
            <mesh position={[0, height/2, 0]} scale={[1.1, 0.1, 1.1]}>
              <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
              <meshBasicMaterial
                color="hsl(60, 80%, 60%)"
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Flowstone formations - bacon-like layered structures */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 25;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`flowstone-${i}`} position={[x, 7, z]}>
            {/* Multiple layers of flowstone */}
            {[...Array(5)].map((_, layer) => (
              <mesh
                key={layer}
                position={[0, -layer * 0.3, 0]}
                rotation={[0, 0, 0]}
                scale={[2 + layer * 0.2, 0.1, 1.5 + layer * 0.1]}
              >
                <cylinderGeometry args={[1, 1.2, 0.2, 16]} />
                <meshBasicMaterial
                  color={`hsl(${20 + layer * 10}, 60%, ${60 + layer * 5}%)`}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      
      {/* Aragonite crystal formations - branching structures */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 35;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`aragonite-${i}`} position={[x, 4, z]}>
            {/* Main crystal trunk */}
            <mesh>
              <cylinderGeometry args={[0.1, 0.2, 2, 6]} />
              <meshBasicMaterial
                color="#e8f4f8"
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Crystal branches */}
            {[...Array(4)].map((_, branch) => {
              const branchAngle = (branch / 8) * Math.PI * 2;
              const branchX = Math.cos(branchAngle) * 0.8;
              const branchZ = Math.sin(branchAngle) * 0.8;
              
              return (
                <mesh
                  key={branch}
                  position={[branchX, 1, branchZ]}
                  rotation={[0.2, branchAngle, 0.3]}
                >
                  <cylinderGeometry args={[0.05, 0.1, 1.2, 6]} />
                  <meshBasicMaterial
                    color="hsl(200, 50%, 80%)"
                    transparent
                    opacity={0.8}
                  />
                </mesh>
              );
            })}
            {/* Crystal tips with glow */}
            <pointLight
              position={[0, 1.5, 0]}
              intensity={2}
              distance={8}
              color="#4dd0e1"
            />
          </group>
        );
      })}
      
      {/* Conulite formations - circular spiral patterns */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 35;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        return (
          <group key={`conulite-${i}`} position={[x, 5, z]}>
            {/* Spiral rings */}
            {[...Array(6)].map((_, ring) => {
              const ringRadius = 0.3 + ring * 0.15;
              const ringHeight = ring * 0.1;
              
              return (
                <mesh
                  key={ring}
                  position={[0, ringHeight, 0]}
                  rotation={[0, ring * 0.3, 0]}
                >
                  <torusGeometry args={[ringRadius, 0.03, 4, 16]} />
                  <meshBasicMaterial
                    color={`hsl(${40 + ring * 5}, 70%, 65%)`}
                    transparent
                    opacity={0.8 - ring * 0.05}
                  />
                </mesh>
              );
            })}
            {/* Center glow */}
            <pointLight
              position={[0, 0.6, 0]}
              intensity={1.5}
              distance={6}
              color="#ffa726"
            />
          </group>
        );
      })}
      
      {/* Layer revelation hint */}
      {revealedLayers < 5 && (
        <mesh position={[0, 1, 0]} visible={false}>
          <sphereGeometry args={[200, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      
      {/* ORIENTATION REFERENCE OBJECTS */}
      {/* AUDIO-REACTIVE Light source at the TOP - bright colors pulse with music */}
      <group position={[0, 50, 0]}>
        <mesh>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial 
            color={referenceObjectColors.lightSource.core} 
            emissive={referenceObjectColors.lightSource.emissive} 
            emissiveIntensity={(currentSong ? 1.2 : 0.8) * visualizationIntensity} 
          />
        </mesh>
        <pointLight
          intensity={referenceObjectColors.lightSource.intensity * visualizationIntensity}
          distance={100}
          color={referenceObjectColors.lightSource.lightColor}
        />
        {/* Audio-reactive light rays effect */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} rotation={[0, angle, 0]} position={[Math.cos(angle) * 3, 0, Math.sin(angle) * 3]}>
              <cylinderGeometry args={[0.05, 0.05, 6]} />
              <meshBasicMaterial 
                color={referenceObjectColors.lightSource.lightColor} 
                transparent 
                opacity={(currentSong ? 0.6 : 0.4) * visualizationIntensity} 
              />
            </mesh>
          );
        })}
        
        {/* Additional pulsing light rings for dramatic effect */}
        {currentSong && [...Array(3)].map((_, i) => (
          <mesh key={`light-ring-${i}`} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[4 + i * 2, 0.2, 8, 32]} />
            <meshBasicMaterial 
              color={referenceObjectColors.lightSource.lightColor}
              transparent 
              opacity={(0.3 - i * 0.1) * visualizationIntensity} 
            />
          </mesh>
        ))}
      </group>
      
      {/* AUDIO-REACTIVE Black hole at the BOTTOM - dark colors pulse with music */}
      <group position={[0, -50, 0]}>
        <mesh>
          <sphereGeometry args={[2.5, 16, 16]} />
          <meshStandardMaterial color={referenceObjectColors.blackHole.core} emissive={referenceObjectColors.blackHole.core} />
        </mesh>
        
        {/* Audio-reactive dark glow */}
        <pointLight
          intensity={referenceObjectColors.blackHole.intensity * visualizationIntensity}
          distance={30}
          color={referenceObjectColors.blackHole.lightColor}
        />
        
        {/* Audio-reactive accretion disk effect */}
        {[...Array(3)].map((_, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3 + i * 1.5, 0.1, 4, 32]} />
            <meshBasicMaterial 
              color={referenceObjectColors.blackHole.accretion[i]} 
              transparent 
              opacity={(currentSong ? 0.8 - i * 0.1 : 0.6 - i * 0.1) * visualizationIntensity} 
            />
          </mesh>
        ))}
        
        {/* Additional dark energy rings when music is playing */}
        {currentSong && [...Array(2)].map((_, i) => (
          <mesh key={`dark-ring-${i}`} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[8 + i * 3, 0.3, 6, 16]} />
            <meshBasicMaterial 
              color={referenceObjectColors.blackHole.accretion[0]}
              transparent 
              opacity={(0.2 - i * 0.05) * visualizationIntensity} 
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
