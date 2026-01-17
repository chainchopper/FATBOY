// Full test with TEXT+AUDIO modalities
const WebSocket = require('ws');

const API_KEY = 'AIzaSyC88mmYOUadI2bRj3_mo2-R1QFTvUMOWTw';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

console.log('=== GEMINI 2.5 NATIVE AUDIO TEST (WITH AUDIO MODALITY) ===\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ WebSocket OPEN');

    const setupMessage = {
        setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generation_config: {
                response_modalities: ['TEXT', 'AUDIO'],
                temperature: 0.7,
                speech_config: {
                    voice_config: {
                        prebuilt_voice_config: {
                            voice_name: 'Puck'
                        }
                    }
                }
            },
            input_audio_transcription: {},
            output_audio_transcription: {}
        }
    };

    console.log('📤 Sending setup...');
    ws.send(JSON.stringify(setupMessage));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('\n📥 RECEIVED:', JSON.stringify(msg, null, 2));

    if (msg.setupComplete) {
        console.log('\n✅ Setup complete! Sending test message...');

        const textMessage = {
            client_content: {
                turns: [
                    {
                        role: 'user',
                        parts: [{ text: 'Say "Hello, Nirvana is now operational!" in a short sentence.' }]
                    }
                ],
                turn_complete: true
            }
        };

        ws.send(JSON.stringify(textMessage));
    }

    if (msg.serverContent?.modelTurn?.parts) {
        const text = msg.serverContent.modelTurn.parts[0]?.text;
        if (text) {
            console.log('\n🎉 MODEL TEXT RESPONSE:', text);
            console.log('\n✅✅✅ SUCCESS! Nirvana is FULLY WORKING! ✅✅✅');
            setTimeout(() => {
                ws.close();
                process.exit(0);
            }, 1000);
        }
    }
});

ws.on('error', (error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log('\n🔌 Closed:', code, reason.toString());
});

setTimeout(() => {
    console.log('\n⏱️ Timeout - no response received in 30 seconds');
    ws.close();
    process.exit(1);
}, 30000);
