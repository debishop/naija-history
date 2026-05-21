/**
 * Publish script — They Killed Four Men to Silence One Voice. It Did Not Work.
 * (The Lens Facebook Page, Today in Nigeria History — Wednesday May 21, 2026)
 *
 * Single-image post. Image:
 *   1. Ken Saro Wiwa portrait — CC BY-SA 4.0 (BBC World Service via Wikimedia Commons)
 *
 * Image source: Wikimedia Commons.
 * Draft sourced from THEAAA-612.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/f7/Ken_Saro-Wisa_close-up_%28cropped%29.jpg';
const IMAGE_1_CAPTION =
  'Ken Saro Wiwa, Nigerian author, poet, television producer, and founder of MOSOP, photographed in a close-up portrait. Credit: BBC World Service via Wikimedia Commons (CC BY SA 4.0).';

const POST_BODY = `They Killed Four Men to Silence One Voice. It Did Not Work.

May 21, 1994. In the town of Giokoo in Ogoniland, four community leaders were beaten to death at a meeting. Edward Kobani, Albert Badey, Samuel Orage and Theophilus Orage never came home. But the man the Nigerian military government truly wanted to silence was not present that day. He had been blocked from entering Ogoniland that morning. By evening, soldiers came for him anyway.

His name was Ken Saro Wiwa.

Ken Saro Wiwa was not simply an activist. He was a celebrated novelist, a poet, and the creator of Basi and Company, a comedy television series estimated to have reached 30 million Nigerian viewers. (Source: Britannica, Ken Saro Wiwa.) Behind the laughter was a man who had spent years watching his homeland be drained of its wealth while his people lived in poverty.

Ogoniland sits in the Niger Delta. Since 1958, an estimated 30 billion dollars worth of oil had been extracted from Ogoni territory. (Source: Wikipedia, Ken Saro Wiwa.) In return, the Ogoni people received polluted rivers and poisoned farmland. Between 1976 and 1991 alone, more than 2 million barrels of crude oil spilled across Ogoniland in 2,976 recorded incidents. (Source: Al Jazeera, Timeline of Oil Spills in Ogoniland.)

In 1990, Ken Saro Wiwa cofounded the Movement for the Survival of the Ogoni People, known as MOSOP, to demand environmental justice and political recognition for the Ogoni. In January 1993, he organised a peaceful march of approximately 300,000 Ogoni people, one of the largest peaceful protests in Nigerian history. (Source: Goldman Environmental Prize, Ken Saro Wiwa profile.) Shell suspended its operations in Ogoniland shortly after. What followed was not negotiation. It was repression.

On May 21, 1994, with four men dead in Giokoo, the military regime of General Sani Abacha had the pretext it needed. Ken Saro Wiwa was arrested along with 14 other MOSOP leaders and charged with inciting the murders. He had not been present at Giokoo. He had been physically prevented from entering Ogoniland that day. (Source: Wikipedia, Ogoni Nine.) It did not matter.

The men faced a special military tribunal, not a civilian court. Key witnesses later admitted they had been bribed with money and employment offers to testify against the accused. Nelson Mandela appealed personally to the Abacha regime. Desmond Tutu pleaded for clemency. Governments around the world called on Abacha to stop. (Source: Al Jazeera, "We all stand before history," 2015.)

None of it worked.

On November 10, 1995, Ken Saro Wiwa and eight other Ogoni men, together known as the Ogoni Nine, were hanged at Port Harcourt prison. The execution was so badly carried out that it reportedly took five attempts before Ken Saro Wiwa died. His last recorded words were: "Lord take my soul, but the struggle continues." (Source: Platform London, The Death of Ken Saro Wiwa.)

The Commonwealth immediately suspended Nigeria. The United States and the European Union imposed sanctions. The world expressed horror. But the Ogoni people remained on poisoned land.

In 2009, Shell paid a settlement of 15.5 million dollars to the Saro Wiwa family and other relatives of the Ogoni Nine, without admitting any liability. (Source: Wikipedia, Ken Saro Wiwa.) In 2011, the United Nations Environment Programme called for a full cleanup of Ogoniland, estimating it would take 25 to 30 years and cost up to one billion dollars. (Source: Wikipedia, Ogoni Nine.) That cleanup has not been completed.

On June 12, 2025, President Bola Tinubu granted posthumous pardons to Ken Saro Wiwa and the members of the Ogoni Nine. (Source: Punch Nigeria, 2025.) Thirty years too late.

From prison, Ken Saro Wiwa wrote: "I and my colleagues are not the only ones on trial. Shell is here on trial." (Source: Al Jazeera, "We all stand before history," 2015.) Ogoniland is still waiting for the world to act on those words.

The struggle continues.

What do you believe Nigeria and the world owe the Ogoni people today? Tell us in the comments.

Photo: Ken Saro Wiwa, Nigerian author, activist, and founder of MOSOP. Credit: BBC World Service via Wikimedia Commons (CC BY SA 4.0).

#KenSaroWiwa #OgoniNine #OgoniPeople #NigerianHistory #TodayInNigeriaHistory #JusticeForOgoni #NigerDeltaJustice #NeverForget #TheLens #EnvironmentalJustice #OilJustice #OgoniLand #NigeriaHistory`;

interface GraphApiError {
  message: string;
  type: string;
  code: number;
}

async function resolvePageAccessToken(pageId: string, token: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}?fields=access_token&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url);
  const json = (await response.json()) as { access_token?: string; error?: GraphApiError };
  if (!response.ok || json.error) {
    return token;
  }
  return json.access_token ?? token;
}

async function uploadPhoto(
  pageId: string,
  pageToken: string,
  imageUrl: string,
  caption: string,
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/photos`;
  const body = new URLSearchParams({
    url: imageUrl,
    caption,
    published: 'false',
    access_token: pageToken,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await response.json()) as { id?: string; error?: GraphApiError };
  if (!response.ok || json.error || !json.id) {
    throw new Error(`Photo upload failed: ${json.error?.message ?? `HTTP ${response.status}`}`);
  }
  return json.id;
}

async function publishWithPhotos(
  pageId: string,
  pageToken: string,
  photoIds: string[],
): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const params = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
  });
  photoIds.forEach((id, i) => {
    params.append(`attached_media[${i}]`, `{"media_fbid":"${id}"}`);
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = (await response.json()) as { id?: string; error?: GraphApiError };
  if (!response.ok || json.error || !json.id) {
    throw new Error(`Publish failed: ${json.error?.message ?? `HTTP ${response.status}`}`);
  }
  return json.id;
}

async function main(): Promise<void> {
  const systemUserToken =
    process.env['FACEBOOK_SYSTEM_USER_TOKEN'] ?? process.env['FACEBOOK_PAGE_ACCESS_TOKEN'];
  const pageId = process.env['FACEBOOK_PAGE_ID'];

  if (!systemUserToken || !pageId) {
    throw new Error(
      'FACEBOOK_SYSTEM_USER_TOKEN (or FACEBOOK_PAGE_ACCESS_TOKEN) and FACEBOOK_PAGE_ID must be set.',
    );
  }

  console.log('Resolving page access token...');
  const pageToken = await resolvePageAccessToken(pageId, systemUserToken);

  console.log('Uploading image (Ken Saro Wiwa portrait)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image uploaded: ${photoId1}`);

  console.log('Publishing post with image...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
