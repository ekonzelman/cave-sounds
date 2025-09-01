import React from 'react';
import { useMusicExplorer } from '../lib/stores/useMusicExplorer';
import { useAudio } from '../lib/stores/useAudio';

export default function GameUI() {
  const { 
    currentSong, 
    discoveredNodes, 
    visualizationFilter, 
    setVisualizationFilter, 
    stopCurrentSong,
    audioAnalyzer 
  } = useMusicExplorer();
  const { toggleMute, isMuted } = useAudio();

  const filters = [
    { id: 'bars', name: 'Frequency Bars' },
    { id: 'wave', name: 'Wave Motion' },
    { id: 'spiral', name: 'Spiral Dance' },
    { id: 'burst', name: 'Energy Burst' }
  ];

  return (
    <>
      
      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1000
      }}>
        {/* Top HUD */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          {/* Game Info */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '15px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
              🎵 Cave Music Explorer
            </div>
            <div>Discovered: {discoveredNodes.length} songs</div>
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
              WASD to move • Q/Z up/down • Mouse to look • E to interact • P for admin
            </div>
          </div>

          {/* Audio Controls */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '15px',
            borderRadius: '8px',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            pointerEvents: 'auto'
          }}>
            <button
              onClick={toggleMute}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {isMuted ? '🔇 Unmute' : '🔊 Mute'}
            </button>
          </div>
        </div>

        {/* Currently Playing */}
        {currentSong && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '20px',
            borderRadius: '8px',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            pointerEvents: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', marginBottom: '5px' }}>
                  Now Playing: {currentSong.title}
                </h3>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  {currentSong.filename}
                </div>
              </div>
              <button
                onClick={stopCurrentSong}
                style={{
                  background: 'rgba(255, 107, 107, 0.2)',
                  border: '1px solid #ff6b6b',
                  color: '#ff6b6b',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Stop
              </button>
            </div>

            {/* Visualization Filters */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ 
                fontSize: '12px', 
                marginBottom: '8px', 
                opacity: 0.8 
              }}>
                Visualization:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setVisualizationFilter(filter.id as any)}
                    style={{
                      background: visualizationFilter === filter.id 
                        ? 'rgba(74, 144, 226, 0.3)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${visualizationFilter === filter.id 
                        ? '#4a90e2' 
                        : 'rgba(255, 255, 255, 0.2)'}`,
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Level Indicator */}
            {audioAnalyzer && (
              <div style={{
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #4a90e2, #4ecdc4, #ff6b6b)',
                    width: '100%',
                    borderRadius: '2px',
                    animation: 'pulse 0.5s ease-in-out infinite alternate'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Discovery notification */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          fontSize: '16px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'none' // Will be shown programmatically for discoveries
        }}>
          🎵 New song discovered! 🎵
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
