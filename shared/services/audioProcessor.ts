/**
 * Audio Processor
 * Real-time microphone capture with PCM encoding for voice pipeline
 * Captures at 16kHz mono for ElevenLabs STT compatibility
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGainNode: GainNode | null = null;
  private onAudioChunk: ((chunk: ArrayBuffer) => void) | null = null;
  private isActive = false;

  async start(onAudioChunk: (chunk: ArrayBuffer) => void): Promise<void> {
    // Prevent double-starts that would create parallel mic streams
    if (this.isActive) {
      this.stop();
    }

    this.onAudioChunk = onAudioChunk;
    this.isActive = true;

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
      this.scriptProcessorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.scriptProcessorNode.onaudioprocess = (event) => {
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
      this.silentGainNode = this.audioContext.createGain();
      this.silentGainNode.gain.value = 0;

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.silentGainNode);
      this.silentGainNode.connect(this.audioContext.destination);
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop(): void {
    this.isActive = false;

    if (this.scriptProcessorNode) {
      this.scriptProcessorNode.onaudioprocess = null;
      this.scriptProcessorNode.disconnect();
      this.scriptProcessorNode = null;
    }

    if (this.silentGainNode) {
      this.silentGainNode.disconnect();
      this.silentGainNode = null;
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
