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
              fov: 75,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
              alpha: false
            }}
          >
            <color attach="background" args={["#000000"]} />
            
            {/* Minimal lighting for point cloud effect */}
            <ambientLight intensity={0.2} color="#ffffff" />
            <pointLight position={[0, 10, 0]} intensity={1} color="#00ffff" distance={100} />
            <pointLight position={[20, 5, 20]} intensity={0.8} color="#ff00ff" distance={80} />
            <pointLight position={[-20, 5, -20]} intensity={0.8} color="#ffff00" distance={80} />

            <Suspense fallback={null}>
              <OrbitControls 
                enableDamping 
                dampingFactor={0.05}
                screenSpacePanning={false}
                minDistance={3}
                maxDistance={100}
                maxPolarAngle={Math.PI / 1.5}
              />
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
