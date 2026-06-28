import { env } from "bun";
import { Streamlink } from "./lib/streamlink";
import { getStreamData, validateToken } from "./lib/twitch";
import { EventSub } from "./lib/eventsub";

interface Channel {
  name: string;
  id: string;
  live: boolean;
  recording?: boolean;
}

//TODO MAKE IT ONLY NAME INPUT
let channels: Channel[] = [
  {
    name: "sennyk4",
    id: "146110596",
    live: false,
  },
];

validateToken(env["TOKEN"] as string).then((data) => {
  if (!data) return console.error("INVALID TOKEN");
  if (!data["client_id"]) return console.error("INVALID DATA: NO CLIENT ID");

  if (!data["expires_in"]) console.warn("Token doesn't have expiry date");

  env["CLIENT_ID"] = data["client_id"];

  console.log(`Set client id as:`, env["CLIENT_ID"]);

  const streamlinkClient = new Streamlink();

  async function record(name: string) {
    console.log(name, "went online, starting recording");

    setRecordingStatus(name, true);

    const streamlinkStatus = await streamlinkClient.record(name);

    if (streamlinkStatus instanceof Error) {
      console.log(`Recording for ${name} stopped due to an error.`);
      setTimeout(() => record(name), 2500);
    } else {
      console.log(`Recording for ${name} finished cleanly.`);
      setLiveStatus(name, false);
    }

    setRecordingStatus(name, false);
  }

  function setLiveStatus(name: string, status: boolean) {
    const foundChannel = channels.find((c) => c["name"] == name);

    if (foundChannel) foundChannel["live"] = status;
  }

  function setRecordingStatus(name: string, status: boolean) {
    const foundChannel = channels.find((c) => c["name"] == name);

    if (foundChannel) foundChannel["recording"] = status;
  }

  getStreamData(...channels.map((c) => c["name"])).then((result) => {
    if (result)
      for (const stream_data of result) {
        record(stream_data["user_login"]);

        setLiveStatus(stream_data["user_login"], true);
      }
  });

  const EventSubClient = new EventSub();

  EventSubClient.on("open", (isNew) => {
    if (isNew) {
      console.log("[ES] New, subbing");
      for (const channel of channels) {
        EventSubClient.subscribe(channel["id"], "stream.online");
        EventSubClient.subscribe(channel["id"], "stream.offline");
      }
    } else {
      console.log("[ES] Already was open");
    }
  });

  EventSubClient.on("event", (type, payload) => {
    // console.log(type, payload);
    if (type == "stream.online") {
      record(payload.event.broadcaster_user_login);

      setLiveStatus(payload.event.broadcaster_user_login, true);
    } else if (type == "stream.offline") {
      setLiveStatus(payload.event.broadcaster_user_login, false);
    }
  });

  EventSubClient.connect();

  // setInterval(() => {
  //   const liveButNotRecording = channels.filter(
  //     (c) => c["live"] && !c["recording"],
  //   );

  //   if (liveButNotRecording.length)
  //     for (const channel of liveButNotRecording) {
  //       record(channel["name"]);
  //     }
  // }, 5000);
});
