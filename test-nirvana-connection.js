// Full test with actual message sending
const WebSocket = require('ws');

const API_KEY = 'AIzaSyC88mmYOUadI2bRj3_mo2-R1QFTvUMOWTw';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

console.log('=== FULL GEMINI 2.5 NATIVE AUDIO TEST ===\n');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log('✅ WebSocket OPEN');

    const setupMessage = {
        setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generation_config: {
                response_modalities: ['TEXT'],
                temperature: 0.7
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
                        parts: [{ text: 'Say hello and confirm you can hear me.' }]
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
            console.log('\n🎉 MODEL RESPONDED:', text);
            console.log('\n✅ SUCCESS! Nirvana is working correctly.');
            ws.close();
            process.exit(0);
        }
    }
});

ws.on('error', (error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log('\n🔌 Closed:', code, reason.toString());
    if (code !== 1000) process.exit(1);
});

setTimeout(() => {
    console.log('\n⏱️ Timeout - no response received');
    ws.close();
    process.exit(1);
}, 30000);
