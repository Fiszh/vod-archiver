import { env } from "process";

interface validateData {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
}

export async function validateToken(
  token: string,
): Promise<validateData | false> {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: {
      Authorization: `OAuth ${token}`,
    },
  });

  if (!res.ok) return false;

  return (await res.json()) as validateData;
}

interface streamData {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  tags: string[];
  is_mature: boolean;
}

export async function getStreamData(
  ...users: string[]
): Promise<streamData[] | false> {
  const params = new URLSearchParams();

  users.forEach((user) => params.append("user_login", user));

  const res = await fetch(
    `https://api.twitch.tv/helix/streams?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${env["TOKEN"]}`,
        "Client-Id": `${env["CLIENT_ID"]}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) return false;

  return (await res.json())["data"] as streamData[];
}
