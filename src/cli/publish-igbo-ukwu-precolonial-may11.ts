/**
 * Publish script — Igbo-Ukwu: The 9th-Century Bronze Masters
 * (The Lens Facebook Page, Precolonial Heritage — Monday May 11, 2026)
 *
 * Four-image post. Image order per Video & Media Producer recommendation:
 *   1. Ceremonial pot (hero/lead)
 *   2. Snail-shell vessel (scroll-stopper)
 *   3. Ornamental staff head (craft detail)
 *   4. Bronze pot (closing)
 *
 * All images: Wikimedia Commons, CC BY-SA 3.0, photographer: Ochiwar.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/2/2e/Intricate_bronze_ceremonial_pot%2C_9th_century%2C_Igbo-Ukwu%2C_Nigeria.jpg';
const IMAGE_1_CAPTION =
  'Intricate bronze ceremonial pot, 9th century, Igbo-Ukwu, Nigeria. National Museum Lagos (Onikan). Photo: Ochiwar, 2013. Source: Wikimedia Commons (CC BY-SA 3.0).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/83/Bronze_ceremonial_vessel_in_form_of_a_snail_shell%2C_9th_century%2C_Igbo-Ukwu%2C_Nigeria.JPG';
const IMAGE_2_CAPTION =
  'Bronze ceremonial vessel in the form of a snail shell, 9th century, Igbo-Ukwu, Nigeria. National Museum Lagos (Onikan). Photo: Ochiwar, 2013. Source: Wikimedia Commons (CC BY-SA 3.0).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/88/Intricate_ornamental_staff_head%2C_9th_century%2C_bronze%2C_Igbo-Ukwu.JPG';
const IMAGE_3_CAPTION =
  'Intricate ornamental staff head, 9th century bronze, Igbo-Ukwu, Nigeria. National Museum Lagos (Onikan). Photo: Ochiwar, 2013. Source: Wikimedia Commons (CC BY-SA 3.0).';

const IMAGE_4_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/1c/Bronze_pot%2C_Igbo-Ukwu%2C_9th_century.JPG';
const IMAGE_4_CAPTION =
  'Bronze pot, Igbo-Ukwu, 9th century, Nigeria. National Museum Lagos (Onikan). Photo: Ochiwar, 2013. Source: Wikimedia Commons (CC BY-SA 3.0).';

const POST_BODY = `A Farmer Dug Into His Backyard in 1938. What He Found Rewrote African History Forever.

In 1938, a man named Isaiah Anozie was digging in his compound in a small town in Anambra State, southeastern Nigeria. He was doing ordinary farmwork. He struck metal.

What Isaiah found that day was not the product of chance alone. It was the legacy of a civilization that had been waiting centuries for the world to notice it. The town was called Igbo Ukwu, and what lay beneath its soil would shake the foundations of everything Western scholars thought they knew about Africa.

When British archaeologist Thurstan Shaw led formal excavations from 1959 to 1964, what emerged from the earth stunned the academic world. Over 700 bronze and copper artifacts. More than 165,000 glass, carnelian and stone beads. Ceremonial vessels, crowns, breastplates, ornamental staff heads, and ritual pots of breathtaking detail and precision.

And radiocarbon dating confirmed the extraordinary truth: these objects were made in the 9th and 10th centuries CE, roughly 800 to 1000 years after Christ. That is at least 500 years before any European arrived on Nigerian shores.

Let that land.

While Europe had not yet seen its Renaissance, while the great Gothic cathedrals of France were barely being imagined, Igbo craftsmen in what is now Anambra State were casting bronze objects so intricate, so refined, that Western scholars could only compare them to the finest jewellery of Rococo Europe and to the work of Italian Renaissance master Benvenuto Cellini. And Igbo Ukwu came first.

The technique they used is called lost wax casting, known in French as cire perdue. It is one of the most demanding metalworking methods in human history. You carve a model in wax, encase it in clay, melt the wax out, and pour molten metal into the hollow space left behind. The result is a one of a kind, extraordinarily detailed object. To produce the level of craft visible in the Igbo Ukwu bronzes requires not just technical knowledge but generations of accumulated mastery.

And this mastery was entirely African in origin. Isotope analysis of the copper confirmed it came from mines in Abakaliki in present day Ebonyi State, not from any European supply chain. The raw materials, the technology, the artistry: all of it was homegrown (Sources: Smarthistory; Factum Foundation).

But the story gets even richer. Those 165,000 beads? The glass ones were traced to Old Cairo, specifically the Fustat workshops of Byzantine era Egypt. That means the people of Igbo Ukwu were engaged in active long distance trans Saharan trade networks in the 9th century, exchanging goods across thousands of kilometres with the civilizations of North Africa and the Middle East (Sources: African History Extra; The Metropolitan Museum of Art).

The artifacts also point to a figure of enormous ritual authority: a priest king or ceremonial leader whose burial chamber these objects adorned. This is not the picture of a stateless, ungoverned people. This is evidence of sophisticated political and spiritual organisation, centuries before any outsider documented it (Sources: Wikipedia; Igbo Ukwu Town Official Site).

The artifacts are now held at the National Museum in Lagos, at the Onikan site. They belong to all Nigerians, and to all of humanity.

Isaiah Anozie did not set out to make history. He just went to work one morning in his own compound. But by the time his shovel struck metal, the ancestors had already done the work. All he had to do was uncover it.

The Igbo Ukwu bronzes do not ask for permission to be great. They simply are.

What do you know about Igbo Ukwu or Nigerian precolonial heritage that you wish more people were taught in school? Tell us in the comments.

#IgboUkwu #NigerianHistory #PrecolonialAfrica #AfricanCivilization #NigerianHeritage #AfricanHistory #IgboCulture #BlackHistory #AfricanArt #BronzeMasters #TheLens #NigeriaProud #KnowYourHistory`;

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

  console.log('Uploading image 1 (ceremonial pot — hero)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (snail-shell vessel)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (ornamental staff head)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Uploading image 4 (bronze pot)...');
  const photoId4 = await uploadPhoto(pageId, pageToken, IMAGE_4_URL, IMAGE_4_CAPTION);
  console.log(`Image 4 uploaded: ${photoId4}`);

  console.log('Publishing post with four images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3, photoId4]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
