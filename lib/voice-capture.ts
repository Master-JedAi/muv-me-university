import { Audio } from "expo-av";
import { Platform } from "react-native";

export type VoiceCaptureMode = "record_transcribe" | "realtime_stream";

export interface VoiceCaptureConfig {
  mode: VoiceCaptureMode;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: VoiceCaptureStatus) => void;
  backendUrl?: string;
}

export type VoiceCaptureStatus =
  | "idle"
  | "requesting_permission"
  | "permission_denied"
  | "recording"
  | "uploading"
  | "transcribing"
  | "streaming"
  | "error";

export interface VoiceCaptureResult {
  transcript: string;
  durationMs: number;
  mode: VoiceCaptureMode;
  uri?: string;
}

export class VoiceCapture {
  private config: VoiceCaptureConfig;
  private recording: Audio.Recording | null = null;
  private status: VoiceCaptureStatus = "idle";
  private startTime: number = 0;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private currentDuration: number = 0;

  constructor(config: VoiceCaptureConfig) {
    this.config = {
      mode: "record_transcribe",
      ...config,
    };
  }

  getStatus(): VoiceCaptureStatus {
    return this.status;
  }

  getDuration(): number {
    return this.currentDuration;
  }

  private setStatus(s: VoiceCaptureStatus) {
    this.status = s;
    this.config.onStatusChange?.(s);
  }

  async requestPermission(): Promise<boolean> {
    this.setStatus("requesting_permission");
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        this.setStatus("permission_denied");
        return false;
      }
      this.setStatus("idle");
      return true;
    } catch (err) {
      this.setStatus("error");
      this.config.onError?.(err as Error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    const { granted } = await Audio.getPermissionsAsync();
    return granted;
  }

  async start(): Promise<boolean> {
    if (this.status === "recording" || this.status === "streaming") return false;

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    if (this.config.mode === "realtime_stream") {
      return this.startRealtimeStream();
    }
    return this.startRecording();
  }

  private async startRecording(): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      this.recording = recording;
      this.startTime = Date.now();
      this.currentDuration = 0;
      this.setStatus("recording");

      this.durationTimer = setInterval(() => {
        this.currentDuration = Math.floor((Date.now() - this.startTime) / 1000);
      }, 1000);

      return true;
    } catch (err) {
      this.setStatus("error");
      this.config.onError?.(err as Error);
      return false;
    }
  }

  private async startRealtimeStream(): Promise<boolean> {
    this.setStatus("streaming");
    this.startTime = Date.now();
    this.currentDuration = 0;
    this.durationTimer = setInterval(() => {
      this.currentDuration = Math.floor((Date.now() - this.startTime) / 1000);
    }, 1000);
    this.config.onTranscript?.("[Realtime streaming not yet connected - upgrade path for Warp]", false);
    return this.startRecording();
  }

  async stop(): Promise<VoiceCaptureResult | null> {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }

    if (!this.recording) {
      this.setStatus("idle");
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = this.recording.getURI();
      const durationMs = Date.now() - this.startTime;
      this.recording = null;

      if (!uri || durationMs < 1000) {
        this.setStatus("idle");
        return null;
      }

      if (this.config.mode === "realtime_stream") {
        this.setStatus("idle");
        return {
          transcript: `[Voice - ${Math.floor(durationMs / 1000)}s]`,
          durationMs,
          mode: "realtime_stream",
          uri,
        };
      }

      this.setStatus("uploading");
      const transcript = await this.uploadAndTranscribe(uri, durationMs);
      this.setStatus("idle");

      return {
        transcript,
        durationMs,
        mode: "record_transcribe",
        uri,
      };
    } catch (err) {
      this.recording = null;
      this.setStatus("error");
      this.config.onError?.(err as Error);
      return null;
    }
  }

  private async uploadAndTranscribe(uri: string, durationMs: number): Promise<string> {
    const backendUrl = this.config.backendUrl;
    if (!backendUrl) {
      return `[Voice - ${Math.floor(durationMs / 1000)}s]`;
    }

    try {
      this.setStatus("transcribing");
      const formData = new FormData();
      const fileType = Platform.OS === "ios" ? "audio/m4a" : "audio/webm";
      const fileName = Platform.OS === "ios" ? "recording.m4a" : "recording.webm";

      formData.append("audio", {
        uri,
        type: fileType,
        name: fileName,
      } as unknown as Blob);

      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      return data.transcript || `[Voice - ${Math.floor(durationMs / 1000)}s]`;
    } catch {
      return `[Voice - ${Math.floor(durationMs / 1000)}s]`;
    }
  }

  async cancel(): Promise<void> {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch {}
      this.recording = null;
    }
    this.setStatus("idle");
  }

  destroy(): void {
    this.cancel();
  }
}

export function createVoiceCapture(config: Partial<VoiceCaptureConfig> = {}): VoiceCapture {
  return new VoiceCapture({
    mode: "record_transcribe",
    ...config,
  });
}
