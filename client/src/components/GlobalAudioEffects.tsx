import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import * as THREE from 'three';

export default function GlobalAudioEffects() {
  const { gl, scene, camera } = useThree();
  const { currentSong, audioAnalyzer } = useMusicExplorer();
  const postProcessingRef = useRef<any>(null);

  // Global screen-space effects based on audio
  useFrame(() => {
    if (currentSong && audioAnalyzer) {
      const frequencyData = audioAnalyzer.getFrequencyData();
      if (frequencyData) {
        const avgFrequency = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
        const normalizedAudio = avgFrequency / 255;
        const bassRange = frequencyData.slice(0, 8).reduce((sum, val) => sum + val, 0) / 8 / 255;
        const time = Date.now() * 0.001;

        // DRAMATIC Scene-wide color filter
        const hue = (time * 40 + normalizedAudio * 100) % 360;
        const intensity = 0.1 + normalizedAudio * 0.3;
        
        // Apply color filter to entire scene
        scene.fog = new THREE.Fog(
          new THREE.Color(`hsl(${hue}, 70%, 20%)`).getHex(),
          10,
          150 + bassRange * 50
        );
        
        // DRAMATIC Camera shake/wobble effect
        if (normalizedAudio > 0.3) {
          const shakeIntensity = (normalizedAudio - 0.3) * 0.5;
          camera.rotation.z = Math.sin(time * 15) * shakeIntensity * 0.02;
          camera.position.y += Math.sin(time * 12) * shakeIntensity * 0.3;
          camera.position.x += Math.cos(time * 8) * shakeIntensity * 0.2;
        }
        
        // Color grading effect - tint the renderer
        gl.toneMappingExposure = 1 + normalizedAudio * 0.5;
      }
    } else {
      // Reset effects when no music is playing
      scene.fog = null;
      camera.rotation.z = 0;
      gl.toneMappingExposure = 1;
    }
  });

  return null; // This component only applies effects, doesn't render anything
}