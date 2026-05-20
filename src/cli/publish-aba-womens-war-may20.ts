/**
 * Publish script — They Came for the Women. The Women Came for the Empire.
 * (The Lens Facebook Page, Today in Nigeria History — Tuesday May 20, 2026)
 *
 * Three-image gallery post. Image order:
 *   1. Somorika Women of Nigeria (early 20th century) — Public Domain
 *   2. Colonial-era photograph from Aba, Nigeria — OGL v1.0 (The National Archives UK)
 *   3. Memorial plaque for 1929 Women's War — CC BY-SA 4.0 (Dappa Solomon, I-PAC PICTURES)
 *
 * Image sources: Wikimedia Commons.
 * Draft sourced from THEAAA-606; fact-checked and verified.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/5/57/Somorika_Women_of_Nigeria_%28early_20th_century%29.jpg';
const IMAGE_1_CAPTION =
  'Somorika Women of Nigeria, early 20th century. This photograph from the colonial era offers a rare window into the lives of women in southeastern Nigeria around the time of the 1929 Women\'s War. Source: Unknown photographer, published in Margery Perham, Native Administration in Nigeria (1937), via Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/4/42/The_National_Archives_UK_-_CO_1069-63-202.jpg';
const IMAGE_2_CAPTION =
  'Colonial-era photograph from Aba, Nigeria, held in The National Archives UK as part of the "Africa Through a Lens" collection. Aba was a major centre of British commercial and administrative activity in southeastern Nigeria, and the epicentre of the 1929 Women\'s War. Source: The National Archives UK via Wikimedia Commons (OGL v1.0).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/5/55/The_Mock_Grave_of_the_1929_Women_Riot.jpg';
const IMAGE_3_CAPTION =
  'The Mock Grave of the 1929 Women\'s War, a memorial plaque in southeastern Nigeria commemorating the women who were killed by British colonial troops during the Aba Women\'s War of November to December 1929. More than 50 women died. Their names endure. Photo: Dappa Solomon / I-PAC PICTURES, 2023, via Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `They Came for the Women. The Women Came for the Empire.

In November 1929, a colonial census taker named Mark Emereuwa arrived at a compound in Oloko village in southeastern Nigeria. He was there to conduct a population census for taxation purposes. But when he approached a woman named Nwanyeruwa and instructed her to count her goats, sheep, and people, she pushed back. Hard.

What she said in that moment ignited one of the most remarkable uprisings in African colonial history: the Women's War of 1929, known in Igbo as Ogu Umunwanyi.

According to the Global Nonviolent Action Database at Swarthmore College, within days of that confrontation, tens of thousands of women had mobilized across six thousand square miles of southeastern Nigeria. They were Igbo, Ibibio, Andoni, Ogoni, Efik, and Ijaw. They came from different languages and traditions. But they were united by one shared fear: the British were about to tax them.

The women had seen what direct taxation had done to the men. They had watched the warrant chief system corrupt local leadership and strip communities of their traditional power. They were not going to sit quietly while the empire came for their livelihoods too.

So they did what women in southeastern Nigeria had done for generations. They danced. They sang. They surrounded the homes of warrant chiefs and Native Court buildings, chanting and demanding that officials either resign or promise there would be no taxation. This practice, known as "sitting on a man," was a traditional form of social sanction that the British completely failed to understand. To the women, it was legitimate, powerful, and organized. To the colonizers, it looked like chaos.

The British response was violence. According to the BlackPast.org entry on the Aba Women's Riots, colonial troops opened fire on the protesting women. More than 50 women were killed. Dozens more were injured. The women had come with nothing but their voices and their bodies. The empire answered with guns.

But the empire did not win.

Historians Toyin Falola and Adam Paddock, in their scholarly work on the Women's War of 1929, document how the scale and coordination of the uprising shocked British colonial administrators. At least 25,000 women took part directly, across a region home to some two million people. The warrant chief system, which had been the foundation of British indirect rule in the southeast, was abolished. Women were appointed to Native Courts for the first time in the history of the colony.

The AfroLegends account of the Aba Women's War describes the uprising as Nigeria's first major anticolonial mass movement, one that predated the formal nationalist movements of the 1940s and 1950s by nearly two decades. These women did not have political parties. They did not have lawyers or newspapers or legislative seats. They had each other.

They had a common language of solidarity that crossed ethnic lines. They had an ancient tradition of collective action that the colonial administration had never bothered to study. And they had an unshakeable understanding that justice was not something given by empire. It was something taken back by the people.

The Encyclopedia.com entry on the Igbo Women's War notes that the uprising forced a formal inquiry, the Aba Commission of Inquiry, which confirmed British mismanagement and ultimately shaped colonial policy reform. The African Liberty account of Africa's Great Tax Revolt frames the event as a turning point in the global story of anticolonial resistance.

Today, the memory of the women who died endures in southeastern Nigeria. Nwanyeruwa, the woman who refused to be counted for taxation, became a symbol of resistance that outlasted the empire that tried to silence her.

She stood in her compound in Oloko. And the whole southeast stood with her.

In 1929, Nigerian women marched against the British Empire and won. What do you think gave these women the courage to stand up when the odds were so heavily against them?

#AbaWomensWar #OguUmunwanyi #NigerianHistory #AfricanWomen #WomensResistance #AntiColonialism #Nwanyeruwa #NigerianWomen #ColonialHistory #AfricanHistory #BlackHistory #WomenWhoFight #HeritageMatters`;

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
    throw new Error('Photo upload failed: ' + (json.error?.message ?? 'HTTP ' + response.status));
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
    throw new Error('Publish failed: ' + (json.error?.message ?? 'HTTP ' + response.status));
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

  console.log('Uploading image 1 (Somorika Women of Nigeria)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Colonial-era Aba photograph)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Memorial plaque for 1929 Women\'s War)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with three-image gallery...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
