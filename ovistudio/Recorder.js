/**
 * OviStudio Recorder
 * Captures Ovi Platform canvas and audio into video files.
 */
export default class Recorder {
    constructor(engine) {
        this.engine = engine;
        this.recorder = null;
        this.chunks = [];
    }

    async start(canvas, externalAudioStream = null) {
        if (!canvas) return;

        // Ensure AudioContext is resumed
        if (this.engine.audioManager) this.engine.audioManager.resume();

        const videoStream = canvas.captureStream(30);
        let audioStream = this.engine.audioManager ? this.engine.audioManager.getStream() : null;

        // If external audio (file) is provided, mix it or replace
        if (externalAudioStream) {
            console.log("🎥 Mixing External Audio Stream...");
            // If we have both system audio (TTS) and External, we might want to mix.
            // For simplicity, let's assume we prioritize external if present, or mix if possible.
            // Web Audio API is best for mixing, but here let's try simple track combination.
            audioStream = externalAudioStream;
        }

        let combinedStream = videoStream;

        if (audioStream && audioStream.getAudioTracks().length > 0) {
            console.log("🎥 Mixing Audio and Video streams...");
            const tracks = [
                ...videoStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ];
            combinedStream = new MediaStream(tracks);
        } else {
            console.warn("🎥 No audio track found. Video will be silent.");
        }

        this.startRecording(combinedStream);
    }

    startFromStream(stream) {
        console.log("🎥 Starting recording from external stream (Screen Share)...");
        this.startRecording(stream);
    }

    startRecording(stream) {
        try {
            // Priority list for High Quality & Compatibility // turbo // overwrite-fix
            const mimeTypes = [
                'video/mp4;codecs=avc1.4d002a,mp4a.40.2', // H.264 + AAC (Strict)
                'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 + AAC (Safari/Mobile fit)
                'video/mp4;codecs=avc1.4d002a',           // H.264 (Auto Audio)
                'video/mp4;codecs=h264',                  // Generic
                'video/mp4',                              // Container only
                'video/webm;codecs=vp9,opus',             // High Efficiency WebM
                'video/webm'                              // Fallback
            ];

            let selectedMimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    selectedMimeType = type;
                    break;
                }
            }

            if (!selectedMimeType) {
                console.warn("No preferred mimeType supported. Using default.");
                selectedMimeType = ''; // Let browser choose default
            }

            console.log(`🎥 Using Format: ${selectedMimeType || 'Browser Default'}`);

            const options = {
                mimeType: selectedMimeType,
                videoBitsPerSecond: 15_000_000, // 15 Mbps
                audioBitsPerSecond: 128_000     // 128 kbps Audio (Critical for MP4 audio)
            };

            // Remove mimeType if empty, let browser default
            if (!selectedMimeType) delete options.mimeType;

            this.recorder = new MediaRecorder(stream, options);

            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };

            this.recorder.onstop = () => {
                const finalType = this.recorder.mimeType || 'video/webm';
                const blob = new Blob(this.chunks, { type: finalType });
                const url = URL.createObjectURL(blob);

                // Determine extension
                const ext = finalType.includes('mp4') ? 'mp4' : 'webm';

                const a = document.createElement('a');
                a.href = url;
                a.download = `ovi_production_${Date.now()}.${ext}`;
                a.click();
                this.chunks = [];

                // Stop all tracks to release camera/screen
                stream.getTracks().forEach(track => track.stop());
            };

            this.recorder.start(); // Remove slice argument for smoother start // turbo
            this.isRecording = true;
            console.log("🎥 Recording started...");
        } catch (e) {
            console.error("Failed to start MediaRecorder:", e);
            alert("Recording failed. " + e.message);
        }
    }

    stop() {
        if (this.recorder && this.recorder.state !== 'inactive') {
            this.recorder.stop();
            this.isRecording = false;
            console.log("🎥 Recording stopped.");
        }
    }

    get isRecording() {
        return this._isRecording || false;
    }

    set isRecording(val) {
        this._isRecording = val;
    }
}
