import { $ } from "bun";
import { homedir } from "os";
import fs from "fs";
import path from "path";

const mainPath = path.join(homedir(), "vod-archiver");
const recordingsPath = path.join(mainPath, "recordings");

type Events = {
  open: () => void;
  opening: () => void;
  close: () => void;
  error: (data: any) => void;
  raw: (data: any) => void;
};

export class Streamlink {
  command: string;
  listeners: Record<string, Function[]>;

  constructor() {
    this.command = "streamlink";
    this.listeners = {};

    fs.promises
      .mkdir(recordingsPath, { recursive: true })
      .then(() => {
        console.log("Directories are ready!");
      })
      .catch((err) => {
        console.error("Failed to create directories:", err);
      });

    $`streamlink --version`
      .then(({ stdout }) => console.log(stdout.toString()))
      .catch((err) =>
        console.error(
          "Streamlink not found:",
          err.exitCode,
          err.stderr.toString(),
        ),
      );
  }

  on<K extends keyof Events>(event: K, cb: Events[K]) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(cb);
  }

  emit = <K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) => {
    if (this.listeners[event])
      for (const cb of this.listeners[event]) cb(...args);
  };

  record = (name: string, clip_name?: string) => {
    const filename = clip_name ?? `${Date.now()}_${name}.ts`;
    const fullOutputPath = path.join(recordingsPath, filename);

    $`streamlink "https://www.twitch.tv/${name}" best \
      --twitch-supported-codecs=av1,h265,h264 \
      --hls-live-restart \
      --stream-segment-threads 4 \
      --stream-segment-attempts 5 \
      --stream-timeout 30 \
      --retry-streams 15 \
      -o ${fullOutputPath}`
      .then(({ stdout }) => console.log(stdout.toString()))
      .catch((err) =>
        console.error(
          "Streamlink error:",
          err.exitCode,
          err.stderr?.toString() || err.message,
        ),
      );
  };
}
