/**
 * Publish script — From Slave Boy to King: The Man the British Empire Could Not Break
 * (The Lens Facebook Page, Colonial Era and Resistance — Tuesday May 13, 2026)
 *
 * Two-image post. Image order:
 *   1. Historical portrait of King Jaja of Opobo (hero/lead)
 *   2. King Jaja Memorial Statue, Opobo (closing)
 *
 * Images: Wikimedia Commons, both CC BY-SA 4.0.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/0/02/King_Jaja_Opobo.jpg';
const IMAGE_1_CAPTION =
  'Historical portrait of King Jaja of Opobo, merchant prince and founder of Opobo city state. Photo: ABORISADEADETONA via Wikimedia Commons (CC BY-SA 4.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/86/King_Jaja_Opobo_statue_2.jpg';
const IMAGE_2_CAPTION =
  'King Jaja Memorial Statue, Opobo, Rivers State, Nigeria. National Monument erected 1903 by public subscription. Photo: Muyiwa OSIFUYE via Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `From Slave Boy to King: The Man the British Empire Could Not Break

There are stories that shake the very foundation of how we understand power, survival, and resistance. The story of King Jaja of Opobo is one of them.

Around 1821, a boy named Jubo Jubogha was born in Umuduruoha, Amaigbo, in what is today Imo State, Nigeria. He had no title. No land. No throne. [Source: Wikipedia, Jaja of Opobo]

Then came the raiders.

As a young child, Jubo was kidnapped and sold into slavery. He was taken to Bonny, one of the most powerful trading city states on the Niger Delta coast. Enslaved, stripped of his identity and renamed, he had every reason to disappear into history without a trace.

But he refused.

What happened next is the kind of story most people will never believe, because it sounds too extraordinary to be real.

Within decades, the enslaved boy had not only earned his freedom but climbed to the very top of Bonny's elite trading system. By 1863, Jubo, now known as Jaja, had risen to lead the Anna Pepple House, one of the most powerful merchant factions in the city. [Source: Wikipedia, Jaja of Opobo; History Rise, King Jaja of Opobo]

But Bonny could not contain him.

After a conflict with a rival faction, Jaja made a bold move that few would dare. He left. He took his loyal traders, relocated, and in 1869 founded an entirely new kingdom: the Kingdom of Opobo. In 1870, he was crowned Amanyanabo, King of Opobo. [Source: Historical Nigeria, The 1887 Deportation of King Jaja of Opobo; Wikipedia, Jaja of Opobo]

And then he built an empire.

King Jaja understood that economic power was the only true defense against colonial ambition. He negotiated directly with European merchants, bypassed British middlemen, and exported 8,000 tons of palm oil annually to Liverpool. He built trade routes that made Opobo one of the wealthiest kingdoms on the West African coast. Some historians have called him Nigeria's first millionaire. [Source: Face2Face Africa, Nigeria's first millionaire; Wikipedia, Jaja of Opobo] He understood commerce. He understood power. And he understood exactly what the British wanted and what they feared.

What they feared was him.

In 1884, the Berlin Conference, a gathering of European powers where not a single African was invited, carved up the continent and handed Opobo to Britain. King Jaja had not consented. He had not been consulted. He had not agreed. [Source: Michael Lobban, Imperial Incarceration, Cambridge University Press, 2021, Chapter 6]

He kept fighting anyway.

By 1887, the British had had enough. Vice Consul Harry Johnston invited King Jaja to a meeting aboard a British vessel, promising his safety. It was a lie. The moment Jaja stepped on board, he was arrested. No trial. No justice. Just betrayal. [Source: Historical Nigeria, The 1887 Deportation of King Jaja of Opobo; Lobban, Imperial Incarceration, Chapter 6]

He was exiled. First to Accra, then to London, then to the West Indies: St. Vincent and Barbados. For four years, from 1887 to 1891, one of Africa's greatest kings was held as a colonial prisoner while his people mourned back in Opobo. The British Parliament debated his deportation on March 2 and April 23, 1888. [Source: UK Parliament Hansard, March 2 and April 23, 1888]

In 1891, Britain finally agreed to let him return home.

He never made it.

King Jaja of Opobo died en route near Tenerife in 1891. But his people never forgot him. [Source: Wikipedia, Jaja of Opobo]

In 1903, the people of Opobo raised a bronze memorial in his honor through public subscription. Not the British government. Not colonial officials. His own people paid for it. [Source: Wikipedia, Jaja of Opobo]

That tells you everything.

A boy stolen into slavery became a king. A king the most powerful empire in the world had to trick, arrest, and exile because they could never defeat him in fair contest.

King Jaja of Opobo did not just survive. He built. He led. He resisted. And he is still remembered.

What do you know about King Jaja of Opobo? Drop a comment below and tell us which part of his story moves you the most.

#KingJajaOfOpobo #NigerianHistory #AfricanKings #ResistanceHistory #TheLensNigeria #NigerDeltaHistory #ColonialResistance #AfricanHeritage #BlackHistory #OpoboKingdom #NigeriaHistory #AfricanGreats #KnowYourHistory`;

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

  console.log('Uploading image 1 (King Jaja portrait — hero)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (King Jaja Memorial Statue)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Publishing post with two images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
