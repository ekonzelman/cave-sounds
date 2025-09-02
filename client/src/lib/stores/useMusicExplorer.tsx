import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from "three";

export type GamePhase = "exploring" | "admin";
export type VisualizationFilter = "bars" | "wave" | "spiral" | "burst";

interface SongNode {
  id: string;
  title: string;
  filename: string;
  position: [number, number, number];
  discovered: boolean;
}

interface AudioAnalyzer {
  getFrequencyData: () => Uint8Array | null;
  getWaveformData: () => Uint8Array | null;
  isPlaying: () => boolean;
}

interface MusicExplorerState {
  gamePhase: GamePhase;
  playerPosition: THREE.Vector3;
  songNodes: SongNode[];
  discoveredNodes: SongNode[];
  currentSong: SongNode | null;
  audioElement: HTMLAudioElement | null;
  audioAnalyzer: AudioAnalyzer | null;
  visualizationFilter: VisualizationFilter;
  isPaused: boolean;
  // Animation transition states
  visualizationIntensity: number; // 0-1, gradually increases when song starts
  isTransitioning: boolean;
  
  // Actions
  setPlayerPosition: (position: THREE.Vector3) => void;
  toggleAdmin: () => void;
  addSongNode: (node: SongNode) => void;
  discoverSongNode: (nodeId: string) => void;
  setCurrentSong: (song: SongNode) => void;
  pauseCurrentSong: () => void;
  resumeCurrentSong: () => void;
  stopCurrentSong: () => void;
  togglePlayPause: (song: SongNode) => void;
  setVisualizationFilter: (filter: VisualizationFilter) => void;
  checkSongNodeInteraction: () => void;
  uploadAudioFile: (file: File) => Promise<void>;
  deleteSongNode: (nodeId: string) => Promise<void>;
  initializeDefaultSongs: () => void;
  updateTransitionAnimation: (deltaTime: number) => void;
}

class SimpleAudioAnalyzer implements AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor(audioElement: HTMLAudioElement) {
    this.audioElement = audioElement;
    this.setupAudioContext();
  }

  private setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      
      if (this.audioElement && !this.sourceNode) {
        this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
      }
    } catch (error) {
      console.error('Error setting up audio context:', error);
    }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode || !this.dataArray) return null;
    this.analyserNode.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getWaveformData(): Uint8Array | null {
    if (!this.analyserNode || !this.dataArray) return null;
    this.analyserNode.getByteTimeDomainData(this.dataArray);
    return this.dataArray;
  }

  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }
}

export const useMusicExplorer = create<MusicExplorerState>()(
  subscribeWithSelector((set, get) => ({
    gamePhase: "exploring",
    playerPosition: new THREE.Vector3(0, 0.5, 0),
    songNodes: [],
    discoveredNodes: [],
    currentSong: null,
    audioElement: null,
    audioAnalyzer: null,
    visualizationFilter: "bars",
    isPaused: false,
    // Initialize transition states
    visualizationIntensity: 0,
    isTransitioning: false,

    setPlayerPosition: (position) => set({ playerPosition: position }),

    toggleAdmin: () => {
      set((state) => ({
        gamePhase: state.gamePhase === "admin" ? "exploring" : "admin"
      }));
    },

    addSongNode: (node) => {
      set((state) => {
        // Check if node already exists to prevent duplicates
        const existingNode = state.songNodes.find(n => n.id === node.id);
        if (existingNode) {
          console.log('Song node already exists, skipping duplicate:', node.id);
          return state; // Return unchanged state
        }
        
        console.log('Adding new song node:', node);
        return {
          songNodes: [...state.songNodes, node]
        };
      });
    },

    discoverSongNode: (nodeId) => {
      set((state) => {
        const updatedNodes = state.songNodes.map(node =>
          node.id === nodeId ? { ...node, discovered: true } : node
        );
        const discoveredNode = updatedNodes.find(node => node.id === nodeId);
        const newDiscoveredNodes = discoveredNode && !state.discoveredNodes.find(n => n.id === nodeId)
          ? [...state.discoveredNodes, discoveredNode]
          : state.discoveredNodes;

        return {
          songNodes: updatedNodes,
          discoveredNodes: newDiscoveredNodes
        };
      });
    },

    setCurrentSong: (song) => {
      const { audioElement, audioAnalyzer } = get();
      
      // Stop current audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // Create new audio element
      const newAudioElement = new Audio(`/api/audio/${song.filename}`);
      newAudioElement.loop = true;
      newAudioElement.volume = 0.7;

      // Create audio analyzer
      const newAnalyzer = new SimpleAudioAnalyzer(newAudioElement);

      // Play the audio
      newAudioElement.play().catch(error => {
        console.error('Error playing audio:', error);
      });

      set({
        currentSong: song,
        audioElement: newAudioElement,
        audioAnalyzer: newAnalyzer,
        isPaused: false,
        // Start transition animation
        visualizationIntensity: 0,
        isTransitioning: true
      });
    },

    pauseCurrentSong: () => {
      const { audioElement } = get();
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
        set({ isPaused: true });
      }
    },

    resumeCurrentSong: () => {
      const { audioElement } = get();
      if (audioElement && audioElement.paused) {
        audioElement.play().catch(error => {
          console.error('Error resuming audio:', error);
        });
        set({ isPaused: false });
      }
    },

    stopCurrentSong: () => {
      const { audioElement } = get();
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      set({
        currentSong: null,
        audioElement: null,
        audioAnalyzer: null,
        isPaused: false,
        // Reset transition states
        visualizationIntensity: 0,
        isTransitioning: false
      });
    },

    togglePlayPause: (song) => {
      const { currentSong, isPaused, setCurrentSong, pauseCurrentSong, resumeCurrentSong } = get();
      
      // If it's not the current song, play it
      if (!currentSong || currentSong.id !== song.id) {
        setCurrentSong(song);
      } else {
        // If it's the same song, toggle pause/resume
        if (isPaused) {
          resumeCurrentSong();
        } else {
          pauseCurrentSong();
        }
      }
    },

    setVisualizationFilter: (filter) => set({ visualizationFilter: filter }),

    checkSongNodeInteraction: () => {
      const { playerPosition, songNodes, discoverSongNode, setCurrentSong } = get();
      
      songNodes.forEach(node => {
        const nodePos = new THREE.Vector3(...node.position);
        const distance = playerPosition.distanceTo(nodePos);
        
        if (distance < 3) {
          if (!node.discovered) {
            discoverSongNode(node.id);
          } else {
            setCurrentSong(node);
          }
        }
      });
    },

    uploadAudioFile: async (file) => {
      const formData = new FormData();
      formData.append('audio', file);

      try {
        const response = await fetch('/api/upload-audio', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        
        // Add the new song node to the cave
        const newNode: SongNode = {
          id: result.id,
          title: result.title,
          filename: result.filename,
          position: result.position,
          discovered: false
        };

        get().addSongNode(newNode);
        
        // Refresh the entire song list to ensure synchronization
        // This handles both database and in-memory storage scenarios
        setTimeout(() => {
          get().initializeDefaultSongs();
        }, 500);
        
        console.log('Song uploaded successfully:', newNode);
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },

    deleteSongNode: async (nodeId) => {
      try {
        const response = await fetch(`/api/songs/${nodeId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Delete failed');
        }

        set((state) => ({
          songNodes: state.songNodes.filter(node => node.id !== nodeId),
          discoveredNodes: state.discoveredNodes.filter(node => node.id !== nodeId),
          currentSong: state.currentSong?.id === nodeId ? null : state.currentSong
        }));
      } catch (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },

    initializeDefaultSongs: () => {
      console.log('Initializing songs...');
      
      // Load existing songs from the server
      fetch('/api/songs')
        .then(response => response.json())
        .then(songs => {
          console.log('Loaded songs from server:', songs.length, 'songs');
          // Ensure we have an array
          const songList = Array.isArray(songs) ? songs : [];
          
          // If no songs from server, use defaults
          if (songList.length === 0) {
            const defaultSongs: SongNode[] = [
              {
                id: 'default-1',
                title: 'Cave Ambience',
                filename: 'background.mp3',
                position: [10, 1, 5],
                discovered: false
              },
              {
                id: 'default-2',
                title: 'Mystery Echo',
                filename: 'hit.mp3',
                position: [-8, 1, -12],
                discovered: false
              },
              {
                id: 'default-3',
                title: 'Discovery Sound',
                filename: 'success.mp3',
                position: [15, 1, -8],
                discovered: false
              }
            ];
            console.log('Using default songs:', defaultSongs.length);
            set({ songNodes: defaultSongs });
          } else {
            console.log('Setting song nodes from server:', songList.map(s => s.title));
            set({ songNodes: songList });
          }
        })
        .catch(error => {
          console.error('Error loading songs from server:', error);
          // Add default songs if server fails completely
          const defaultSongs: SongNode[] = [
            {
              id: 'default-1',
              title: 'Cave Ambience',
              filename: 'background.mp3',
              position: [10, 1, 5],
              discovered: false
            },
            {
              id: 'default-2',
              title: 'Mystery Echo',
              filename: 'hit.mp3',
              position: [-8, 1, -12],
              discovered: false
            },
            {
              id: 'default-3',
              title: 'Discovery Sound',
              filename: 'success.mp3',
              position: [15, 1, -8],
              discovered: false
            }
          ];
          console.log('Falling back to default songs due to server error');
          set({ songNodes: defaultSongs });
        });
    },

    updateTransitionAnimation: (deltaTime) => {
      const { isTransitioning, visualizationIntensity } = get();
      
      if (isTransitioning) {
        const transitionSpeed = 1.8; // How fast the transition happens (higher = faster)
        const newIntensity = Math.min(1, visualizationIntensity + deltaTime * transitionSpeed);
        
        // Use easing for smooth transitions - cubic ease out
        const easedIntensity = 1 - Math.pow(1 - newIntensity, 3);
        
        set({ visualizationIntensity: easedIntensity });
        
        // End transition when fully faded in
        if (newIntensity >= 1) {
          set({ isTransitioning: false });
        }
      }
    }
  }))
);

// Initialize default songs when the store is created
useMusicExplorer.getState().initializeDefaultSongs();
