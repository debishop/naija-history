/**
 * Direct publish for Today in Nigerian History — Death of Herbert Macaulay (May 7, 1946).
 * No database dependency — uses Facebook API directly via env vars.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/0/04/Herbert_Macaulay_portrait.jpg';
const IMAGE_CAPTION =
  'Herbert Macaulay (1864–1946), Father of Nigerian Nationalism. Photo: Public Domain via Wikimedia Commons.';

const POST_BODY = `He lived long enough to light the fire. He did not live long enough to see it blaze into full flame.

On May 7, 1946, Herbert Macaulay passed away in Lagos at the age of 81. He had spent his final months travelling across Nigeria, rallying communities behind the push for independence. Even as his body weakened, his voice did not. He died on the road, in the middle of the fight he had started decades before. Nigeria would not gain independence until 1960. Herbert Macaulay never saw that day.

And yet he is called the Father of Nigerian Nationalism, and the title is not given lightly.

Macaulay was born in Lagos on 14 November 1864. His bloodline alone tells you something about the world he came from. He was the grandson of Bishop Samuel Ajayi Crowther, the first African to be ordained as an Anglican bishop. That legacy of intellectual courage and faith shaped him. He trained as a civil engineer, studied in England, and returned to Nigeria with both skills and a sharpened political consciousness.

The land of his people became his first battleground. When the colonial government moved to acquire Lagos land belonging to the House of Docemo, Macaulay did not stay silent. He wrote powerful essays and campaigned publicly, arguing that the Crown had no right to strip Lagosians of their ancestral land. His advocacy helped bring these injustices to public attention and established him as a fearless defender of his people.

Politics, journalism, and organisation were his weapons. In 1923, he founded the Nigerian National Democratic Party, the first proper political party in the country. Through his newspaper, the Lagos Daily News, he gave Nigerians a platform to read voices that pushed back against colonial rule. He was arrested, imprisoned, and harassed. He kept going.

Even in old age, Macaulay did not slow down. In 1944, at 79 years old, he joined Nnamdi Azikiwe in founding the National Council of Nigeria and the Cameroons. Two generations of nationalism, working together. The NCNC became the most important nationalist organisation of its era, channelling the energy of Nigerians who were tired of waiting for the freedom they deserved.

That final tour in 1946 was part of that campaign. He was 81. He boarded trains, addressed crowds, and spoke to anyone who would listen about what was possible if Nigeria stood together. He collapsed before the tour was finished.

Before he died, those close to him reported that his last words to his colleagues were to pause for four days, and then carry on. Carry on. Not grief. Not surrender. Instructions. Even dying, Herbert Macaulay was organising.

There is something that moves you when you sit with that image. An 81 year old man, on the road, refusing to stop, telling the movement that his death was not a reason to pause for long. He gave everything and then told others to give everything too.

His portrait has appeared on Nigerian currency. He is the face of the 1 naira coin, a quiet but enduring reminder that the freedom Nigerians enjoy was purchased by extraordinary people who gave everything they had. His name is in the history books. Schools, streets, and institutions carry his name. But the real monument is the country itself. Every Nigerian who has ever voted, argued, debated, demanded, or simply felt that they had a right to shape their own nation is standing on ground that Macaulay helped prepare.

He was jailed. He was mocked. He was dismissed by the colonial establishment. None of it stopped him. He died before independence came, but he helped make independence possible. That is not a small thing. That is everything.

Today, May 7, marks 80 years since Nigeria lost one of its greatest sons.

Take a moment with that.

Which Nigerian historical figure do you think deserves more recognition than they currently receive? Let us know in the comments.

Sources: Wikipedia (en.wikipedia.org/wiki/Herbert_Macaulay) | BlackPast.org | Guardian Nigeria | CBN Nigeria

#NigerianHistory #HerbertMacaulay #FatherOfNigerianNationalism #TodayInHistory #NigerianHeritage #Nationalism #Nigeria #AfricanHistory #TheLens #NationalismNigeria #MayHistory`;

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

async function uploadPhoto(pageId: string, pageToken: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/photos`;
  const body = new URLSearchParams({
    url: IMAGE_URL,
    caption: IMAGE_CAPTION,
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

async function publishWithPhoto(pageId: string, pageToken: string, photoId: string): Promise<string> {
  const url = `${GRAPH_API_BASE}/${pageId}/feed`;
  const body = new URLSearchParams({
    message: POST_BODY,
    access_token: pageToken,
    'attached_media[0]': `{"media_fbid":"${photoId}"}`,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
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

  console.log('Uploading photo...');
  const photoId = await uploadPhoto(pageId, pageToken);
  console.log(`Photo uploaded: ${photoId}`);

  console.log('Publishing post...');
  const postId = await publishWithPhoto(pageId, pageToken, photoId);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
