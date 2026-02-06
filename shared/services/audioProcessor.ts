/**
 * Audio Processor
 * Real-time microphone capture with PCM encoding for voice pipeline
 * Captures at 16kHz mono for ElevenLabs STT compatibility
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onAudioChunk: ((chunk: ArrayBuffer) => void) | null = null;

  async start(onAudioChunk: (chunk: ArrayBuffer) => void): Promise<void> {
    this.onAudioChunk = onAudioChunk;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      const bufferSize = 2048;
      const scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      scriptProcessor.onaudioprocess = (event) => {
        if (!this.onAudioChunk) return;

        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        this.onAudioChunk(pcmData.buffer);
      };

      // CRITICAL: Use silent gain node to avoid feedback loop
      // ScriptProcessor needs connection to trigger onaudioprocess,
      // but we DON'T want to play mic audio through speakers
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;

      this.sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(silentGain);
      silentGain.connect(this.audioContext.destination);
    } catch (error) {
      throw error;
    }
  }

  stop(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onAudioChunk = null;
  }
}

export default AudioProcessor;
