import { env } from "bun";

type Events = {
  open: () => void;
  opening: () => void;
  close: () => void;
  error: (data: any) => void;
  sent: (data: any) => void;
  send_error: (data: any) => void;
  raw: (data: any) => void;
};

export class Streamlink {
  url: string;
  api_url: string;
  ws: WebSocket | null;
  session_id?: string;
  listeners: Record<string, Function[]>;

  constructor() {
    this.url = "wss://eventsub.wss.twitch.tv/ws";
    this.api_url = "https://api.twitch.tv";
    this.ws = null;
    this.listeners = {};
  }

  on<K extends keyof Events>(event: K, cb: Events[K]) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(cb);
  }

  emit = <K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) => {
    if (this.listeners[event])
      for (const cb of this.listeners[event]) cb(...args);
  };

  async subscribe(channel_id: number): Promise<Boolean> {
    try {
      const res = await fetch(this.api_url + "/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env["TOKEN"]}`,
          "Client-Id": `${env["CLIENT_ID"]}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "stream.online",
          version: "1",
          condition: {
            broadcaster_user_id: String(channel_id),
          },
          transport: {
            method: "websocket",
            session_id: this.session_id,
          },
        }),
      });

      if (!res.ok) console.error("Failed subscribing!", res);

      return res.ok;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}
