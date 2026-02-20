import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logEvent } from "./storage";

interface TranscriptDelta {
  type: "transcript_delta";
  text: string;
  isFinal: boolean;
}

interface VoiceMessage {
  type: string;
  learnerId?: string;
  audioData?: string;
}

export function setupVoiceGateway(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws/voice" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("Voice WebSocket client connected");
    let learnerId: string | null = null;
    let transcriptBuffer = "";

    ws.on("message", async (data: Buffer | string) => {
      try {
        const message: VoiceMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "start_session": {
            learnerId = message.learnerId || null;
            transcriptBuffer = "";
            ws.send(
              JSON.stringify({
                type: "session_started",
                mode: "transcription",
                message:
                  "Voice session started. Send audio frames for transcription.",
              }),
            );

            if (learnerId) {
              await logEvent({
                learnerId,
                eventType: "voice_session_start",
                payload: { mode: "transcription" },
              });
            }
            break;
          }

          case "audio_frame": {
            const simulatedWords = [
              "I",
              "want",
              "to",
              "learn",
              "about",
              "this",
              "topic",
            ];
            const randomWord =
              simulatedWords[
                Math.floor(Math.random() * simulatedWords.length)
              ];
            transcriptBuffer += (transcriptBuffer ? " " : "") + randomWord;

            const delta: TranscriptDelta = {
              type: "transcript_delta",
              text: randomWord,
              isFinal: false,
            };
            ws.send(JSON.stringify(delta));
            break;
          }

          case "end_session": {
            const finalTranscript = transcriptBuffer || message.learnerId;
            ws.send(
              JSON.stringify({
                type: "transcript_final",
                text: finalTranscript,
                isFinal: true,
              }),
            );

            if (learnerId) {
              await logEvent({
                learnerId,
                eventType: "voice_session_end",
                payload: { transcript: finalTranscript },
              });
            }

            transcriptBuffer = "";
            break;
          }

          case "send_transcript": {
            ws.send(
              JSON.stringify({
                type: "transcript_final",
                text: message.audioData || transcriptBuffer,
                isFinal: true,
              }),
            );
            break;
          }

          default:
            ws.send(
              JSON.stringify({
                type: "error",
                message: `Unknown message type: ${message.type}`,
              }),
            );
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to process message",
          }),
        );
      }
    });

    ws.on("close", () => {
      console.log("Voice WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      console.error("Voice WebSocket error:", err);
    });
  });

  console.log("Voice WebSocket gateway initialized at /ws/voice");
  return wss;
}
