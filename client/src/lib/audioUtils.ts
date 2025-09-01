export interface AudioData {
  buffer: AudioBuffer;
  analyser: AnalyserNode;
  source: AudioBufferSourceNode;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }

  async loadAudioFile(url: string): Promise<AudioData | null> {
    if (!this.audioContext) return null;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(this.gainNode!);
      
      return {
        buffer: audioBuffer,
        analyser,
        source
      };
    } catch (error) {
      console.error('Error loading audio file:', error);
      return null;
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  suspend() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }
}

export const audioManager = new AudioManager();

export function getFrequencyData(analyser: AnalyserNode): Uint8Array {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

export function getWaveformData(analyser: AnalyserNode): Uint8Array {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);
  return dataArray;
}

export function analyzeAudioFeatures(frequencyData: Uint8Array) {
  const bass = frequencyData.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10;
  const mid = frequencyData.slice(10, 100).reduce((sum, val) => sum + val, 0) / 90;
  const treble = frequencyData.slice(100).reduce((sum, val) => sum + val, 0) / (frequencyData.length - 100);
  
  const overall = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length;
  
  return {
    bass: bass / 255,
    mid: mid / 255,
    treble: treble / 255,
    overall: overall / 255
  };
}
