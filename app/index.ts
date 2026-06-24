import { env } from "bun";
import { Streamlink } from "./lib/streamlink";
import { validateToken } from "./lib/twitch";
import { EventSub } from "./lib/eventsub";

validateToken(env["TOKEN"] as string).then((data) => {
  if (!data) return console.error("INVALID TOKEN");
  if (!data["client_id"]) return console.error("INVALID DATA: NO CLIENT ID");

  if (!data["expires_in"]) console.warn("Token doesn't have expiry date");

  env["CLIENT_ID"] = data["client_id"];

  console.log(`Set client id as:`, env["CLIENT_ID"]);

  const streamlinkClient = new Streamlink();

  const EventSubClient = new EventSub();

  EventSubClient.on("open", (isNew) => {
    if (isNew) {
      console.log("sub logic");
      EventSubClient.subscribe("528761326", "stream.online");
    } else {
      console.log("already was open");
    }
  });

  EventSubClient.on("event", (type, payload) => {
    // console.log(type, payload);
    if (type == "stream.online") {
      console.log(payload.event.broadcaster_user_login + "online");
      streamlinkClient.record(payload.event.broadcaster_user_login);
    }
  });

  EventSubClient.connect();
});
