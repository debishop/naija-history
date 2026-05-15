/**
 * Publish script — How Nigeria Gave the World Its Soundtrack and Changed Music Forever
 * (The Lens Facebook Page, Modern Nigeria — Thursday May 15, 2026)
 *
 * Four-image gallery post. Image order:
 *   1. Aerial view of Lagos, Nigeria (origin/wonder)
 *   2. Fela Kuti circa 1986 (legacy/defiance)
 *   3. Burna Boy at Nativeland Concert, Lagos 2016 (energy/momentum)
 *   4. Wizkid in Algiers 2025 (triumph/arrival)
 *
 * Images: Wikimedia Commons. Image 2 is Public Domain; others CC BY-SA 4.0.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/18/Aerial_view_of_Lagos%2C_Nigeria.jpg';
const IMAGE_1_CAPTION =
  'Aerial view of Lagos, Nigeria. The city where Afrobeats was born. Photo: Adebayo Oluwole (Bayooze) via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/12/Fela_Kuti_circa_1986.jpg';
const IMAGE_2_CAPTION =
  'Fela Anikulapo Kuti circa 1986. The godfather of Afrobeat, born in Abeokuta, Nigeria. Photo: Celluloid Records / Billboard (Public Domain).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/5/52/Afrobeats_star_Burna_Boy_performing_with_at_Nativeland_Concert%2C_Lagos%2C_Nigeria_2016.jpg';
const IMAGE_3_CAPTION =
  'Burna Boy performing at the Nativeland Concert, Lagos, Nigeria, 2016. Photo: Catherine Omeresan Sutherland via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_4_URL =
  'https://upload.wikimedia.org/wikipedia/commons/d/d4/Wizkid_in_Canex_-_Algiers_2025.jpg';
const IMAGE_4_CAPTION =
  'Wizkid performing in Algiers, 2025. Photo: Muhammed amine benloulou via Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `How Nigeria Gave the World Its Soundtrack and Changed Music Forever

There is a moment that no one who witnessed it will ever forget.

On January 31, 2026, at the 68th Grammy Awards Special Merit ceremony in Los Angeles, history was made. Fela Anikulapo Kuti, the rebellious genius from Abeokuta who died in 1997, became the first African artist ever to receive the Grammy Lifetime Achievement Award. Nearly three decades after his death, the world had finally caught up to what Nigeria always knew. (Source: Al Jazeera, Channels Television)

It was not just an award. It was a verdict on an entire continent's contribution to global music, driven above all by one country.

Fela was born on October 15, 1938, in Abeokuta, Nigeria. In the late 1960s, he did something audacious. He took Yoruba traditional music and fused it with American jazz, funk, and soul, building an entirely new genre out of the collision. He called it Afrobeat. He used it as a weapon against military dictatorship. His compound in Lagos, the Kalakuta Republic, became a sanctuary for artists and activists. The Nigerian military burned it to the ground on February 18, 1977. They thought they were silencing him. They were only making him louder. His 1976 album Zombie, a fierce political protest record, was inducted into the Grammy Hall of Fame in 2025. (Source: Grammy.com)

That fire in Lagos could not stop what Fela had started. It only turned the spark into an inferno. The music traveled further than the soldiers ever imagined it could.

Fast forward to today. Nigeria has not just built on that foundation. It has conquered the world.

Wizkid helped write and featured on Drake's One Dance in 2016. That song became the first track in history to reach 1 billion streams on Spotify. It spent 10 nonconsecutive weeks at number one on the Billboard Hot 100. (Source: Grammy.com, Guinness World Records) His song Essence, released in 2021, became the first Nigerian track to chart simultaneously on both the Billboard Hot 100 and the Billboard Global 200. (Source: Billboard)

Davido's Fall became the longest charting Nigerian song in Billboard Hot 100 history. (Source: Billboard)

Tems won the Grammy for Best African Music Performance at the 2025 Grammys with Love Me JeJe, becoming the first Nigerian artist to win two Grammy Awards. She also became the first African female artist to surpass 1 billion Spotify streams for a single track, proving that Nigerian women are just as central to this global story as anyone else. (Source: OkayAfrica, techpoint.africa)

And the numbers behind all of this are staggering.

Afrobeats generated over 14 billion annual streams on Spotify in 2023. In 2024, that growth accelerated by 114%. (Source: thecable.ng) Globally, Afrobeats listenership rose by 22% in Spotify Wrapped 2025. (Source: techpoint.africa) Streams in Latin America are up more than 400% since 2020. In Brazil alone, that figure reached a 500% spike. (Source: thecreativebrief.africa) Nigerian royalties paid to artists on Spotify hit approximately $38 million in 2024, a record for Nigerian creators on the continent. (Source: Reuters, Arise News)

Nigerian artists make up 61% of all music streams inside Nigeria itself, the highest domestic share for any country in Africa and the Middle East. (Source: naijascene.com)

Think about what that means. A genre born in one city, Lagos, from one man's refusal to be silent, now fills stadiums in London and New York, floods playlists in Sao Paulo and Seoul, and generates billions of streams across every continent on earth.

The Grammy in 2026 did not create Fela's legacy. It confirmed what Lagos had always known.

Nigeria did not just produce music. Nigeria gave the world its soundtrack.

When did YOU first realise Afrobeats had gone global? Was it the first time you heard One Dance on the radio, when Tems crossed a billion streams, or somewhere else entirely? Drop your moment below and let us know!

#ModernNigeria #AfrobeatsToTheWorld #NaijaMusic #FelaKuti #Afrobeats #MadeInLagos #NigeriaProud #AfricanMusic #Wizkid #BurnaBoy #Tems #MusicIsTheWeapon #NigeriaConquers`;

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

  console.log('Uploading image 1 (Aerial Lagos — origin)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Fela Kuti 1986 — legacy)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Burna Boy Lagos 2016 — energy)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Uploading image 4 (Wizkid Algiers 2025 — triumph)...');
  const photoId4 = await uploadPhoto(pageId, pageToken, IMAGE_4_URL, IMAGE_4_CAPTION);
  console.log(`Image 4 uploaded: ${photoId4}`);

  console.log('Publishing post with four-image gallery...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3, photoId4]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
