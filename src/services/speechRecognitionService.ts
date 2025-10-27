export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private transcript: string = '';
  private onTranscriptUpdate?: (transcript: string) => void;
  private onEnd?: (finalTranscript: string) => void;
  private onError?: (error: string) => void;
  private autoRestart: boolean = false;
  private restartAttempts: number = 0;
  private maxRestartAttempts: number = 3;
  private restartDelay: number = 1000;

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

      if (event.error === 'network') {
        console.warn('Network error in speech recognition, attempting auto-restart...');
        if (this.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++;
          setTimeout(() => {
            if (this.autoRestart) {
              try {
                console.log(`Restarting speech recognition (attempt ${this.restartAttempts}/${this.maxRestartAttempts})`);
                this.recognition.start();
              } catch (restartError) {
                console.error('Failed to restart speech recognition:', restartError);
                if (this.onError) {
                  this.onError('network-restart-failed');
                }
              }
            }
          }, this.restartDelay * this.restartAttempts);
        } else if (this.onError) {
          this.onError(event.error);
        }
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        if (this.onError) {
          this.onError('microphone-permission-denied');
        }
      } else if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.autoRestart && this.restartAttempts < this.maxRestartAttempts) {
        console.log('Speech recognition ended, auto-restarting...');
        setTimeout(() => {
          if (this.autoRestart) {
            try {
              this.recognition.start();
              this.isListening = true;
            } catch (error) {
              console.error('Failed to auto-restart speech recognition:', error);
            }
          }
        }, 100);
      } else if (this.onEnd) {
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
    onErrorCallback: (error: string) => void,
    enableAutoRestart: boolean = true
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
    this.autoRestart = enableAutoRestart;
    this.restartAttempts = 0;

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

    this.autoRestart = false;

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
    this.autoRestart = false;
    this.restartAttempts = 0;
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
