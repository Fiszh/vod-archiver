import { env } from "bun";
import { Streamlink } from "./lib/streamlink";
import { getStreamData, validateToken } from "./lib/twitch";
import { EventSub } from "./lib/eventsub";

validateToken(env["TOKEN"] as string).then((data) => {
  if (!data) return console.error("INVALID TOKEN");
  if (!data["client_id"]) return console.error("INVALID DATA: NO CLIENT ID");

  if (!data["expires_in"]) console.warn("Token doesn't have expiry date");

  env["CLIENT_ID"] = data["client_id"];

  console.log(`Set client id as:`, env["CLIENT_ID"]);

  const streamlinkClient = new Streamlink();

  function record(name: string) {
    console.log(name, "went online, starting recording");
    streamlinkClient.record(name);
  }

  getStreamData("sennyk4").then((result) => {
    if (result)
      for (const stream_data of result) {
        record(stream_data["user_login"]);
      }
  });

  const EventSubClient = new EventSub();

  EventSubClient.on("open", (isNew) => {
    if (isNew) {
      console.log("sub logic");
      EventSubClient.subscribe("146110596", "stream.online");
    } else {
      console.log("already was open");
    }
  });

  EventSubClient.on("event", (type, payload) => {
    // console.log(type, payload);
    if (type == "stream.online") record(payload.event.broadcaster_user_login);
  });

  EventSubClient.connect();
});
