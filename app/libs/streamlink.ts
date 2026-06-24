import { $ } from "bun";

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

  record = (name: string, clip_name?: string) =>
    $`streamlink https://www.twitch.tv/${name} best -o ${clip_name ?? String(Date.now()) + "_" + name}.ts`
      .then(({ stdout }) => console.log(stdout.toString()))
      .catch((err) =>
        console.error(
          "Streamlink not found:",
          err.exitCode,
          err.stderr.toString(),
        ),
      );
}
