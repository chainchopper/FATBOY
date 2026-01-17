import { Injectable } from '@angular/core';
import { GoogleGenAI, Modality, LiveServerMessage, Type } from '@google/genai';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeminiConfig {
    model?: string;
    voice?: string;
    temperature?: number;
    systemInstruction?: string;
    tools?: any[];
}

export interface GeminiResponse {
    text?: string;
    audioData?: Uint8Array;
    toolCalls?: Array<{
        id: string;
        name: string;
        args: any;
    }>;
    inputTranscription?: string;
    outputTranscription?: string;
    turnComplete: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class GeminiSdkService {
    private session: any = null;
    private audioContext: AudioContext | null = null;
    private nextStartTime = 0;
    private activeSources = new Set<AudioBufferSourceNode>();

    private isConnected$ = new BehaviorSubject<boolean>(false);
    private responses$ = new Subject<GeminiResponse>();
    private connectionError$ = new BehaviorSubject<string>('');

    constructor() { }

    get connectionStatus$(): Observable<boolean> {
        return this.isConnected$.asObservable();
    }

    get responses(): Observable<GeminiResponse> {
        return this.responses$.asObservable();
    }

    get errors$(): Observable<string> {
        return this.connectionError$.asObservable();
    }

    isReady(): boolean {
        return this.isConnected$.value && this.session !== null;
    }

    async connect(config: GeminiConfig): Promise<boolean> {
        try {
            const ai = new GoogleGenAI({ apiKey: environment.nirvanaApiKey });

            // Initialize audio context for output
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            this.session = await ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        console.log('[GeminiSDK] Connected successfully');
                        this.isConnected$.next(true);
                    },
                    onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
                    onerror: (error: any) => {
                        console.error('[GeminiSDK] Error:', error);
                        this.connectionError$.next(error?.message || 'Connection error');
                        this.disconnect();
                    },
                    onclose: () => {
                        console.log('[GeminiSDK] Connection closed');
                        this.disconnect();
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: (config.voice || 'Puck') as any
                            }
                        }
                    },
                    systemInstruction: config.systemInstruction,
                    tools: config.tools || [],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {}
                }
            });

            return true;
        } catch (error) {
            console.error('[GeminiSDK] Connection failed:', error);
            this.connectionError$.next(`Connection failed: ${error}`);
            return false;
        }
    }

    disconnect(): void {
        if (this.session) {
            try {
                this.session.close();
            } catch { }
            this.session = null;
        }

        if (this.audioContext) {
            this.audioContext.close().catch(() => { });
            this.audioContext = null;
        }

        this.activeSources.forEach(source => {
            try { source.stop(); } catch { }
        });
        this.activeSources.clear();

        this.isConnected$.next(false);
        this.nextStartTime = 0;
    }

    sendText(text: string): void {
        if (!this.session) {
            console.error('[GeminiSDK] Cannot send text: not connected');
            return;
        }

        this.session.sendRealtimeInput({ text });
    }

    sendAudio(pcmData: Uint8Array): void {
        if (!this.session) {
            console.error('[GeminiSDK] Cannot send audio: not connected');
            return;
        }

        const base64 = this.encode(pcmData);
        this.session.sendRealtimeInput({
            media: {
                data: base64,
                mimeType: 'audio/pcm;rate=16000'
            }
        });
    }

    sendToolResponse(responses: Array<{ id: string; name: string; response: any }>): void {
        if (!this.session) {
            console.error('[GeminiSDK] Cannot send tool response: not connected');
            return;
        }

        this.session.sendToolResponse({
            functionResponses: responses
        });
    }

    private async handleMessage(msg: LiveServerMessage): Promise<void> {
        const response: GeminiResponse = {
            turnComplete: false
        };

        // Handle input transcription
        if (msg.serverContent?.inputTranscription) {
            response.inputTranscription = msg.serverContent.inputTranscription.text;
        }

        // Handle output transcription
        if (msg.serverContent?.outputTranscription) {
            response.outputTranscription = msg.serverContent.outputTranscription.text;
        }

        // Handle text response
        const text = msg.serverContent?.modelTurn?.parts?.[0]?.text;
        if (text) {
            response.text = text;
        }

        // Handle audio response
        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio && this.audioContext) {
            try {
                const audioData = this.decode(base64Audio);
                response.audioData = audioData;

                // Play audio
                await this.playAudio(audioData);
            } catch (error) {
                console.error('[GeminiSDK] Error playing audio:', error);
            }
        }

        // Handle tool calls
        if (msg.toolCall) {
            response.toolCalls = msg.toolCall.functionCalls.map((fc: any) => ({
                id: fc.id,
                name: fc.name,
                args: fc.args
            }));
        }

        // Handle turn complete
        if (msg.serverContent?.turnComplete) {
            response.turnComplete = true;
        }

        // Handle interruption
        if (msg.serverContent?.interrupted) {
            this.stopAudio();
        }

        this.responses$.next(response);
    }

    private async playAudio(audioData: Uint8Array): Promise<void> {
        if (!this.audioContext) return;

        const buffer = await this.decodeAudioData(audioData);

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.nextStartTime = Math.max(this.nextStartTime, this.audioContext.currentTime);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;

        this.activeSources.add(source);
        source.onended = () => this.activeSources.delete(source);
    }

    private stopAudio(): void {
        this.activeSources.forEach(source => {
            try { source.stop(); } catch { }
        });
        this.activeSources.clear();
        this.nextStartTime = 0;
    }

    private async decodeAudioData(data: Uint8Array): Promise<AudioBuffer> {
        if (!this.audioContext) throw new Error('No audio context');

        const dataInt16 = new Int16Array(data.buffer);
        const numChannels = 1;
        const sampleRate = 24000;
        const frameCount = dataInt16.length / numChannels;

        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }

        return buffer;
    }

    private encode(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private decode(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
}
