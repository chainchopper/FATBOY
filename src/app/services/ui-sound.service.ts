import { Injectable } from '@angular/core';

/**
 * UI Sound Service
 * Provides audio feedback for user interactions throughout the app
 */
@Injectable({
  providedIn: 'root'
})
export class UiSoundService {
  private audioContext: AudioContext | null = null;
  private soundEnabled = true;
  private volume = 0.3; // Default volume (0.0 to 1.0)

  constructor() {
    // Initialize on first user interaction to comply with browser autoplay policies
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.initializeAudioContext();
    }
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('[UI Sound] Web Audio API not supported:', error);
    }
  }

  /**
   * Enable or disable UI sounds
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Set global volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Play a click sound for button interactions
   */
  playClick(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.05);

    gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.05);
  }

  /**
   * Play a hover sound for subtle feedback
   */
  playHover(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(this.volume * 0.05, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.03);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.03);
  }

  /**
   * Play a success sound for positive actions
   */
  playSuccess(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Two-tone success chord
    oscillator1.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
    oscillator2.frequency.setValueAtTime(659.25, this.audioContext.currentTime); // E5

    gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator1.start(this.audioContext.currentTime);
    oscillator2.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.3);
    oscillator2.stop(this.audioContext.currentTime + 0.3);
  }

  /**
   * Play an error sound for negative feedback
   */
  playError(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  /**
   * Play a notification sound
   */
  playNotification(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Pleasant notification tone
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1046.5, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  /**
   * Play a scan sound for barcode/QR scanning
   */
  playScan(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Scanning beep
    oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1500, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(this.volume * 0.25, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * Play a whoosh sound for page transitions
   */
  playWhoosh(): void {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }
}
