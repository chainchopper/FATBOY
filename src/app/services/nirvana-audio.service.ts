import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NirvanaService } from './nirvana.service';

/**
 * NirvanaAudioService
 * 
 * Handles real-time microphone capture and streaming to Nirvana.
 * Specifically designed for the 16-bit PCM 16kHz format required by the Live API.
 */
@Injectable({
    providedIn: 'root'
})
export class NirvanaAudioService {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    private isCapturingSubject = new BehaviorSubject<boolean>(false);
    public isCapturing$ = this.isCapturingSubject.asObservable();

    private audioLevelSubject = new BehaviorSubject<number>(0);
    public audioLevel$ = this.audioLevelSubject.asObservable();

    constructor(private nirvanaService: NirvanaService) { }

    /**
     * Start capturing audio from the microphone
     */
    async startCapture(): Promise<boolean> {
        if (this.isCapturingSubject.value) return true;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Initialize AudioContext at 16kHz for native Nirvana compatibility
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000
            });

            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Use ScriptProcessorNode (2048 buffer size for ~128ms chunks)
            this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isCapturingSubject.value) return;

                const inputData = e.inputBuffer.getChannelData(0);
                this.processAudioChunk(inputData);
                this.updateAudioLevel(inputData);
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isCapturingSubject.next(true);
            console.log('[Nirvana Audio] Microphone capture started at 16kHz');
            return true;
        } catch (error) {
            console.error('[Nirvana Audio] Error accessing microphone:', error);
            return false;
        }
    }

    /**
     * Stop capturing audio
     */
    stopCapture(): void {
        if (!this.isCapturingSubject.value) return;

        this.isCapturingSubject.next(false);
        this.audioLevelSubject.next(0);

        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        console.log('[Nirvana Audio] Microphone capture stopped');
    }

    /**
     * Process a chunk of Float32 audio and send it as Int16 PCM to Nirvana
     */
    private processAudioChunk(float32Data: Float32Array): void {
        // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
        const int16Buffer = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
            // Clamp values and scale to 16-bit range
            const s = Math.max(-1, Math.min(1, float32Data[i]));
            int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send the buffer to Nirvana via NirvanaService
        this.nirvanaService.sendAudio(int16Buffer.buffer);
    }

    /**
     * Update the audio level for UI visualization
     */
    private updateAudioLevel(data: Float32Array): void {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        // Simple scaling for visualization (0 to 1 approx)
        const level = Math.min(1, rms * 5);
        this.audioLevelSubject.next(level);
    }
}
