import { EventEmitter, Injectable } from '@angular/core';
import { NotificationService } from './notification.service';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private synth: SpeechSynthesisUtterance | null = null;
  private recognition: any;
  private isListening = false;
  public commandRecognized = new EventEmitter<string>(); // New EventEmitter

  constructor(private notificationService: NotificationService) {
    if ('SpeechSynthesisUtterance' in window) {
      this.synth = new SpeechSynthesisUtterance();
      this.synth.lang = 'en-US';
      this.synth.rate = 1.0;
      this.synth.pitch = 1.0;
    } else {
      console.warn('Web Speech API (SpeechSynthesis) is not supported in this browser.');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.notificationService.showInfo(`You said: "${transcript}"`, 'Voice Input');
        console.log('Speech recognized:', transcript);
        this.isListening = false;
        this.commandRecognized.emit(transcript.toLowerCase()); // Emit the recognized command
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          this.notificationService.showError(`Voice input error: ${event.error}`, 'Voice Error');
        }
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    } else {
      console.warn('Web Speech API (SpeechRecognition) is not supported in this browser.');
    }
  }

  speak(text: string): void {
    if (this.synth && 'speechSynthesis' in window) {
      this.synth.text = text;
      window.speechSynthesis.speak(this.synth);
    } else {
      console.warn('TTS not available or not supported.');
    }
  }

  startListening(): void {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
      this.notificationService.showInfo('Listening for commands...', 'Voice Input');
    } else if (this.isListening) {
      this.notificationService.showWarning('Already listening.', 'Voice Input');
    } else {
      this.notificationService.showError('Speech recognition not available.', 'Voice Error');
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.notificationService.showInfo('Stopped listening.', 'Voice Input');
    }
  }

  get listening(): boolean {
    return this.isListening;
  }
}