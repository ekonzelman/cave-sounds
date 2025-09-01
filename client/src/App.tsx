import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls, OrbitControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { useMusicExplorer } from "./lib/stores/useMusicExplorer";
import "@fontsource/inter";
import Cave from "./components/Cave";
import Player from "./components/Player";
import GameUI from "./components/GameUI";
import AdminPanel from "./components/AdminPanel";
import * as THREE from "three";

// Define control keys for cave exploration
enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  admin = 'admin'
}

const controls = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.interact, keys: ["KeyE", "Space"] },
  { name: Controls.admin, keys: ["KeyP"] }
];

function App() {
  const { gamePhase, toggleAdmin } = useMusicExplorer();
  const [showCanvas, setShowCanvas] = useState(false);

  // Show the canvas once everything is loaded
  useEffect(() => {
    setShowCanvas(true);
  }, []);

  // Handle admin panel toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'p' || event.key === 'P') {
        toggleAdmin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleAdmin]);

  if (!showCanvas) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#fff' 
      }}>
        Loading Cave Explorer...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {gamePhase === 'admin' ? (
        <AdminPanel />
      ) : (
        <KeyboardControls map={controls}>
          <Canvas
            shadows
            camera={{
              position: [0, 5, 10],
              fov: 60,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
              alpha: false
            }}
          >
            <color attach="background" args={["#0a0a0a"]} />
            
            {/* Basic lighting for cave atmosphere */}
            <ambientLight intensity={0.1} color="#4a4a7a" />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={0.3}
              color="#ffffff"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffa500" distance={50} />

            <Suspense fallback={null}>
              <Cave />
              <Player />
            </Suspense>
          </Canvas>
          <GameUI />
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
