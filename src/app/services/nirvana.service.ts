import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { NotificationService } from './notification.service';

// Nirvana Message Types
export interface NirvanaSetupMessage {
  setup: {
    model: string;
    generation_config?: {
      temperature?: number;
      max_output_tokens?: number;
      response_modalities?: string[];
      speech_config?: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: string;
          };
        };
      };
    };
    system_instruction?: {
      parts: Array<{ text: string }>;
    };
    tools?: Array<{
      function_declarations: Array<{
        name: string;
        description: string;
        parameters: any;
      }>;
    }>;
    input_audio_transcription?: {};
    output_audio_transcription?: {};
  };
}

export interface NirvanaClientContentMessage {
  client_content: {
    turns: Array<{
      role: 'user' | 'model';
      parts: Array<{
        text?: string;
        inline_data?: {
          mime_type: string;
          data: string; // base64 encoded
        };
      }>;
    }>;
    turn_complete: boolean;
  };
}

export interface NirvanaToolResponseMessage {
  tool_response: {
    function_responses: Array<{
      id: string;
      name: string;
      response: {
        result: any;
      };
    }>;
  };
}

export interface NirvanaRealtimeInputMessage {
  realtime_input: {
    media_chunks: Array<{
      mime_type: string;
      data: string; // base64 PCM audio
    }>;
  };
}

export interface NirvanaResponse {
  text?: string;
  audioData?: ArrayBuffer;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: any;
  }>;
  thinking?: string;
  turnComplete: boolean;
}

export interface NirvanaConfig {
  model?: string;
  voice?: string;
  temperature?: number;
  enableAudio?: boolean;
  enableThinkingMode?: boolean;
  enableGrounding?: boolean;
  language?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NirvanaService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private wsEndpoint: string;
  private isConnected$ = new BehaviorSubject<boolean>(false);
  private connectionError$ = new Subject<string>();
  private responses$ = new Subject<NirvanaResponse>();

  private currentConfig: NirvanaConfig = {
    model: 'models/gemini-2.5-flash',
    voice: 'Puck',
    temperature: 0.7,
    enableAudio: true,
    enableThinkingMode: false,
    enableGrounding: false,
    language: 'en-US'
  };

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private sessionActive = false;
  private pendingToolCalls: Map<string, any> = new Map();

  // Audio handling
  private audioContext: AudioContext | null = null;
  private audioQueue: Float32Array[] = [];
  private isPlayingAudio = false;

  constructor(private notificationService: NotificationService) {
    this.apiKey = environment.nirvanaApiKey || '';
    this.wsEndpoint = environment.nirvanaLiveApiEndpoint;

    if (!this.apiKey || this.apiKey === 'your_nirvana_api_key_here') {
      console.warn('[Nirvana] API key not configured. Intelligence features will be unavailable.');
    }
  }

  /**
   * Initialize connection to Nirvana
   */
  async connect(config?: Partial<NirvanaConfig>): Promise<boolean> {
    if (this.isConnected$.value) {
      console.log('[Nirvana] Already connected');
      return true;
    }

    if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
      const error = '[Nirvana] Cannot connect: API key not configured';
      console.error(error);
      this.connectionError$.next(error);
      return false;
    }

    // Update config if provided
    if (config) {
      this.currentConfig = { ...this.currentConfig, ...config };
    }

    try {
      // Build WebSocket URL with API key
      const wsUrl = `${this.wsEndpoint}?key=${this.apiKey}`;
      console.log('[Nirvana] Connecting to:', this.wsEndpoint);

      return new Promise<boolean>((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.handleConnectionOpen();
          resolve(true);
        };

        this.ws.onmessage = (event) => this.handleMessage(event);

        this.ws.onerror = (error) => {
          console.error('[Nirvana] WebSocket error during connection:', error);
          this.handleError(error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => this.handleConnectionClose();

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.error('[Nirvana] Connection timeout');
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      }).then(() => {
        // Initialize audio context if audio is enabled
        if (this.currentConfig.enableAudio) {
          this.initializeAudioContext();
        }
        return true;
      }).catch(error => {
        console.error('[Nirvana] Connection failed:', error);
        this.connectionError$.next(`Connection failed: ${error.message}`);
        return false;
      });
    } catch (error) {
      console.error('[Nirvana] Connection failed:', error);
      this.connectionError$.next(`Connection failed: ${error}`);
      return false;
    }
  }

  /**
   * Disconnect from Nirvana
   */
  disconnect(): void {
    if (this.ws) {
      this.sessionActive = false;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected$.next(false);

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Send a text message to Nirvana
   */
  async sendText(text: string, systemInstruction?: string): Promise<void> {
    if (!this.isConnected$.value) {
      await this.connect();
    }

    const message: NirvanaClientContentMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts: [{ text }]
          }
        ],
        turn_complete: true
      }
    };

    this.sendMessage(message);
  }

  /**
   * Send an image to Nirvana for vision analysis
   * @param imageData - Base64 encoded image data
   * @param mimeType - Image MIME type (e.g., 'image/jpeg', 'image/png')
   * @param text - Optional text prompt to accompany the image
   */
  async sendImage(imageData: string, mimeType: string, text?: string): Promise<void> {
    if (!this.isConnected$.value) {
      await this.connect();
    }

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

    if (text) {
      parts.push({ text });
    }

    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imageData
      }
    });

    const message: NirvanaClientContentMessage = {
      client_content: {
        turns: [
          {
            role: 'user',
            parts
          }
        ],
        turn_complete: true
      }
    };

    this.sendMessage(message);
  }

  /**
   * Send audio data to Nirvana (real-time streaming)
   * @param audioData - PCM audio data (16-bit, 16kHz)
   */
  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.isConnected$.value || !this.currentConfig.enableAudio) {
      return;
    }

    // Convert audio to base64
    const base64Audio = this.arrayBufferToBase64(audioData);
    this.sendMediaChunk('audio/pcm', base64Audio);
  }

  /**
   * Send a video frame to Nirvana (real-time streaming)
   * @param imageData - Base64 encoded JPEG data
   */
  async sendVideoFrame(imageData: string): Promise<void> {
    if (!this.isConnected$.value) {
      return;
    }
    this.sendMediaChunk('image/jpeg', imageData);
  }

  /**
   * Send media chunks to Nirvana (real-time streaming)
   */
  private async sendMediaChunk(mimeType: string, data: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: NirvanaRealtimeInputMessage = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: mimeType,
            data: data
          }
        ]
      }
    };

    this.sendMessage(message);
  }

  /**
   * Send tool execution results back to Nirvana
   */
  async sendToolResponse(toolCallId: string, functionName: string, result: any): Promise<void> {
    const message: NirvanaToolResponseMessage = {
      tool_response: {
        function_responses: [
          {
            id: toolCallId,
            name: functionName,
            response: {
              result
            }
          }
        ]
      }
    };

    this.sendMessage(message);
    this.pendingToolCalls.delete(toolCallId);
  }

  /**
   * Update session configuration
   */
  updateConfig(config: Partial<NirvanaConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };

    // If already connected, send updated config
    if (this.isConnected$.value) {
      this.sendSetupMessage();
    }
  }

  /**
   * Observables for external components
   */
  get connectionStatus$(): Observable<boolean> {
    return this.isConnected$.asObservable();
  }

  get responses(): Observable<NirvanaResponse> {
    return this.responses$.asObservable();
  }

  get errors$(): Observable<string> {
    return this.connectionError$.asObservable();
  }

  /**
   * Check if Nirvana is ready to use
   */
  isReady(): boolean {
    return this.isConnected$.value && this.sessionActive;
  }

  /**
   * Private: Handle WebSocket connection open
   */
  private handleConnectionOpen(): void {
    console.log('[Nirvana] Connected successfully');
    this.isConnected$.next(true);
    this.reconnectAttempts = 0;

    // Send initial setup message
    this.sendSetupMessage();
  }

  /**
   * Private: Send setup/configuration message
   */
  private sendSetupMessage(tools?: any[], systemInstruction?: string): void {
    const setupMessage: NirvanaSetupMessage = {
      setup: {
        model: this.currentConfig.model!,
        generation_config: {
          temperature: this.currentConfig.temperature,
          response_modalities: ['TEXT', 'AUDIO'], // Always include AUDIO for native audio model
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.currentConfig.voice!
              }
            }
          }
        }
      }
    };

    // Add system instruction if provided
    if (systemInstruction) {
      setupMessage.setup.system_instruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Add tools if provided
    if (tools && tools.length > 0) {
      setupMessage.setup.tools = [
        {
          function_declarations: tools
        }
      ];
    }

    // Enable audio transcriptions for better debugging and visibility
    setupMessage.setup.input_audio_transcription = {};
    setupMessage.setup.output_audio_transcription = {};

    console.log('[Nirvana] Sending setup message:', JSON.stringify(setupMessage, null, 2));
    this.sendMessage(setupMessage);
    this.sessionActive = true;
  }

  /**
   * Private: Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('[Nirvana] Received message:', JSON.stringify(data, null, 2));

      // Handle server content (model responses)
      if (data.serverContent) {
        this.handleServerContent(data.serverContent);
      }

      // Handle tool calls
      if (data.toolCall) {
        this.handleToolCall(data.toolCall);
      }

      // Handle setup complete
      if (data.setupComplete) {
        console.log('[Nirvana] Setup complete, session ready');
      }

    } catch (error) {
      console.error('[Nirvana] Error parsing message:', error);
      console.error('[Nirvana] Raw message:', event.data);
    }
  }

  /**
   * Private: Handle server content responses
   */
  private handleServerContent(serverContent: any): void {
    const response: NirvanaResponse = {
      turnComplete: serverContent.turnComplete || false
    };

    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        // Handle text response
        if (part.text) {
          response.text = part.text;
        }

        // Handle inline audio data
        if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
          const audioData = this.base64ToArrayBuffer(part.inlineData.data);
          response.audioData = audioData;

          // Queue audio for playback
          if (this.currentConfig.enableAudio) {
            this.queueAudioPlayback(audioData);
          }
        }
      }
    }

    // Handle grounded content (if enabled)
    if (serverContent.groundingMetadata) {
      console.log('[Nirvana] Grounding metadata:', serverContent.groundingMetadata);
    }

    this.responses$.next(response);
  }

  /**
   * Private: Handle tool call requests from Nirvana
   */
  private handleToolCall(toolCall: any): void {
    const toolCallData = {
      id: toolCall.functionCalls[0].id,
      name: toolCall.functionCalls[0].name,
      args: toolCall.functionCalls[0].args
    };

    this.pendingToolCalls.set(toolCallData.id, toolCallData);

    const response: NirvanaResponse = {
      toolCalls: [toolCallData],
      turnComplete: false
    };

    this.responses$.next(response);
  }

  /**
   * Private: Handle WebSocket errors
   */
  private handleError(error: Event): void {
    console.error('[Nirvana] WebSocket error:', error);
    this.connectionError$.next('Connection error occurred');
  }

  /**
   * Private: Handle connection close
   */
  private handleConnectionClose(): void {
    console.log('[Nirvana] Connection closed');
    this.isConnected$.next(false);
    this.sessionActive = false;

    // Attempt reconnection if not manually disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Nirvana] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('[Nirvana] Max reconnection attempts reached');
      this.connectionError$.next('Connection lost. Please refresh the page.');
    }
  }

  /**
   * Private: Send message through WebSocket
   */
  private sendMessage(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Nirvana] Cannot send message: WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Private: Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 // Nirvana outputs at 24kHz
      });
    }
  }

  /**
   * Private: Queue audio data for playback
   */
  private queueAudioPlayback(audioData: ArrayBuffer): void {
    // Convert PCM data to Float32Array for Web Audio API
    const int16Array = new Int16Array(audioData);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0; // Convert to -1.0 to 1.0 range
    }

    this.audioQueue.push(float32Array);

    if (!this.isPlayingAudio) {
      this.playNextAudioChunk();
    }
  }

  /**
   * Private: Play next audio chunk from queue
   */
  private playNextAudioChunk(): void {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    this.isPlayingAudio = true;
    const audioData = this.audioQueue.shift()!;

    const audioBuffer = this.audioContext!.createBuffer(1, audioData.length, 24000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    source.onended = () => {
      this.playNextAudioChunk();
    };

    source.start();
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Register function tools with Nirvana
   */
  registerTools(tools: any[], systemInstruction?: string): void {
    this.sendSetupMessage(tools, systemInstruction);
  }
}
