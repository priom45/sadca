export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private transcript: string = '';
  private onTranscriptUpdate?: (transcript: string) => void;
  private onEnd?: (finalTranscript: string) => void;
  private onError?: (error: string) => void;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      this.transcript += finalTranscript;
      const currentTranscript = this.transcript + interimTranscript;

      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(currentTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) {
        this.onEnd(this.transcript);
      }
    };
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  async startListening(
    onUpdate: (transcript: string) => void,
    onComplete: (transcript: string) => void,
    onErrorCallback: (error: string) => void
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    if (this.isListening) {
      console.warn('Speech recognition is already listening');
      return;
    }

    this.transcript = '';
    this.onTranscriptUpdate = onUpdate;
    this.onEnd = onComplete;
    this.onError = onErrorCallback;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      throw error;
    }
  }

  stopListening(): string {
    if (!this.isListening) {
      return this.transcript;
    }

    if (this.recognition) {
      this.recognition.stop();
    }

    this.isListening = false;
    return this.transcript;
  }

  getCurrentTranscript(): string {
    return this.transcript;
  }

  reset(): void {
    this.transcript = '';
    this.isListening = false;
    this.onTranscriptUpdate = undefined;
    this.onEnd = undefined;
    this.onError = undefined;
  }

  async transcribeAudioBlob(audioBlob: Blob): Promise<string> {
    console.log('Audio blob transcription requested. Size:', audioBlob.size);

    if (audioBlob.size === 0) {
      throw new Error('Audio blob is empty');
    }

    const currentTranscript = this.getCurrentTranscript();
    if (currentTranscript && currentTranscript.trim().length > 0) {
      return currentTranscript;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(this.transcript || 'Unable to transcribe audio. Please ensure microphone permission is granted.');
      };
      reader.onerror = () => {
        reject(new Error('Failed to read audio blob'));
      };
      reader.readAsArrayBuffer(audioBlob);
    });
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
