import { env } from "bun";

type Events = {
  open: (isNew?: boolean) => void;
  opening: (isNew?: boolean) => void;
  close: () => void;
  error: (data: any) => void;
  sent: (data: any) => void;
  send_error: (data: any) => void;
  event: (type: string, data: any) => void;
  raw: (data: string) => void;
};

export class EventSub {
  readonly url: string;
  reconnect_url?: string;
  readonly api_url: string;
  ws: WebSocket | null;
  session_id?: string;
  listeners: Record<string, Function[]>;
  subscriptions: Map<string, { id: number | string; type: string }>;
  keepalive_interval?: ReturnType<typeof setTimeout>;
  info: {
    last_message?: string;
    keepalive_timeout?: number;
  };

  constructor() {
    this.url = "wss://eventsub.wss.twitch.tv/ws";
    this.api_url = "https://api.twitch.tv";
    this.ws = null;
    this.listeners = {};
    this.subscriptions = new Map();
    this.info = {};
  }

  on<K extends keyof Events>(event: K, cb: Events[K]) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(cb);
  }

  emit = <K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) => {
    if (this.listeners[event])
      for (const cb of this.listeners[event]) cb(...args);
  };

  connect(oldSocket?: WebSocket) {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => this.emit("opening"));

    this.ws.addEventListener("message", async (data: Record<string, any>) => {
      data = JSON.parse(data["data"].toString());

      if (data?.metadata?.message_type) {
        switch (data.metadata.message_type) {
          case "session_welcome":
            if (data?.payload?.session?.id) {
              this.session_id = data.payload.session.id;

              this.info.keepalive_timeout =
                (data.payload.session.keepalive_timeout_seconds + 1) * 1000;

              clearInterval(this.keepalive_interval);
              this.keepalive_interval = setInterval(() => {
                if (
                  this.info.last_message &&
                  this.ws &&
                  this.info.keepalive_timeout &&
                  Date.now() - new Date(this.info.last_message).getTime() >
                    this.info.keepalive_timeout
                ) {
                  console.log(
                    `Last message exceeded ${this.info.keepalive_timeout / 1000} seconds, attempting reconnect.`,
                  );

                  if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.close();
                  } else {
                    this.connect();
                  }
                }
              }, this.info.keepalive_timeout);

              console.log("[ES] Session open!", this.session_id);
            }

            if (!oldSocket) {
              console.log("[ES] New Connection");

              if (this.subscriptions.size) {
                console.log("[ES] Resubbing to events");

                for (const event of this.subscriptions.values()) {
                  const { id, type } = event;
                  const subbed = await this.subscribe(id, type);

                  if (subbed) {
                    console.log(`[ES] Subscribed to ${type}`);
                  } else {
                    console.log(`[ES] Failed to subscribe to ${type}`);
                  }
                }
              } else {
                console.log("[ES] No events to resub to");
              }
            } else {
              console.log("[ES] Recovered Connection");
            }

            oldSocket?.close();

            this.emit("open", !oldSocket && !this.subscriptions.size);

            break;
          case "notification":
            if (data?.metadata?.subscription_type)
              this.emit("event", data.metadata.subscription_type, data.payload);

            break;
          case "session_reconnect":
            this.reconnect_url =
              (data.payload.session.reconnect_url as string) ?? null;

            break;
          case "session_keepalive":
          default:
            this.info.last_message = (data?.metadata?.message_timestamp ??
              String(Date.now())) as string;

            break;
        }
      }
    });

    this.ws.addEventListener("close", () => (this.reconnect_url = undefined));
  }

  async subscribe(channel_id: number | string, type: string): Promise<Boolean> {
    try {
      const res = await fetch(this.api_url + "/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env["TOKEN"]}`,
          "Client-Id": `${env["CLIENT_ID"]}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
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

      if (!res.ok) console.error("[ES] Failed subscribing!", res);
      if (res.ok) {
        console.log("[ES] Subscribed!");

        this.subscriptions.set(String(channel_id) + type, {
          id: channel_id,
          type,
        });
      }

      return res.ok;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}
