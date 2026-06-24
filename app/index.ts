import { env } from "bun";
import { Streamlink } from "./libs/streamlink";
import { validateToken } from "./libs/twitch";

new Streamlink();

validateToken(env["TOKEN"] as string).then((data) => {
  if (!data) return console.error("INVALID TOKEN");
  if (!data["client_id"]) return console.error("INVALID DATA: NO CLIENT ID");

  if (!data["expires_in"]) console.warn("Token doesn't have expiry date");

  env["CLIENT_ID"] = data["client_id"];

  console.log(`Set client id as:`, env["CLIENT_ID"]);
});
