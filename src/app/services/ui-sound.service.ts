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

  // Audio timing constants
  private readonly CLICK_DURATION = 0.05;
  private readonly HOVER_DURATION = 0.03;
  private readonly SUCCESS_DURATION = 0.3;
  private readonly ERROR_DURATION = 0.2;
  private readonly NOTIFICATION_DURATION = 0.2;
  private readonly SCAN_DURATION = 0.1;
  private readonly WHOOSH_DURATION = 0.3;
  private readonly FADE_OUT = 0.01;

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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('[UI Sound] Web Audio API not supported:', error);
    }
  }

  /**
   * Check if sound can be played
   */
  private canPlaySound(): boolean {
    return this.soundEnabled && this.audioContext !== null;
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
    if (!this.canPlaySound()) return;
    
    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    oscillator.frequency.setValueAtTime(800, this.audioContext!.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext!.currentTime + this.CLICK_DURATION);

    gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.CLICK_DURATION);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + this.CLICK_DURATION);
  }

  /**
   * Play a hover sound for subtle feedback
   */
  playHover(): void {
    if (!this.canPlaySound()) return;
    
    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    oscillator.frequency.setValueAtTime(1200, this.audioContext!.currentTime);
    gainNode.gain.setValueAtTime(this.volume * 0.05, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.HOVER_DURATION);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + this.HOVER_DURATION);
  }

  /**
   * Play a success sound for positive actions
   */
  playSuccess(): void {
    if (!this.canPlaySound()) return;
    
    const oscillator1 = this.audioContext!.createOscillator();
    const oscillator2 = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    // Two-tone success chord
    oscillator1.frequency.setValueAtTime(523.25, this.audioContext!.currentTime); // C5
    oscillator2.frequency.setValueAtTime(659.25, this.audioContext!.currentTime); // E5

    gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.SUCCESS_DURATION);

    oscillator1.start(this.audioContext!.currentTime);
    oscillator2.start(this.audioContext!.currentTime);
    oscillator1.stop(this.audioContext!.currentTime + this.SUCCESS_DURATION);
    oscillator2.stop(this.audioContext!.currentTime + this.SUCCESS_DURATION);
  }

  /**
   * Play an error sound for negative feedback
   */
  playError(): void {
    if (!this.canPlaySound()) return;
    
    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    oscillator.frequency.setValueAtTime(200, this.audioContext!.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext!.currentTime + this.ERROR_DURATION);

    gainNode.gain.setValueAtTime(this.volume * 0.2, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.ERROR_DURATION);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + this.ERROR_DURATION);
  }

  /**
   * Play a notification sound
   */
  playNotification(): void {
    if (!this.canPlaySound()) return;
    
    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    // Pleasant notification tone
    oscillator.frequency.setValueAtTime(880, this.audioContext!.currentTime);
    oscillator.frequency.setValueAtTime(1046.5, this.audioContext!.currentTime + 0.1);

    gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.NOTIFICATION_DURATION);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + this.NOTIFICATION_DURATION);
  }

  /**
   * Play a scan sound for barcode/QR scanning
   */
  playScan(): void {
    if (!this.canPlaySound()) return;
    
    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    // Scanning beep
    oscillator.frequency.setValueAtTime(2000, this.audioContext!.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1500, this.audioContext!.currentTime + this.SCAN_DURATION);

    gainNode.gain.setValueAtTime(this.volume * 0.25, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.SCAN_DURATION);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + this.SCAN_DURATION);
  }

  /**
   * Play a whoosh sound for page transitions
   */
  playWhoosh(): void {
    if (!this.canPlaySound()) return;
    
    const oscillator = this.audioContext!.createOscillator();
    const gainNode = this.audioContext!.createGain();
    const filter = this.audioContext!.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, this.audioContext!.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioContext!.currentTime + this.WHOOSH_DURATION);

    oscillator.frequency.setValueAtTime(800, this.audioContext!.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext!.currentTime + this.WHOOSH_DURATION);

    gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(this.FADE_OUT, this.audioContext!.currentTime + this.WHOOSH_DURATION);

    oscillator.start(this.audioContext!.currentTime);
    oscillator.stop(this.audioContext!.currentTime + this.WHOOSH_DURATION);
  }
}
