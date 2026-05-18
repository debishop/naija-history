/**
 * Publish script — Kingdom of Benin Bronze Civilization
 * (The Lens Facebook Page, Precolonial Heritage — Monday May 18, 2026)
 *
 * Three-image gallery post. Image order:
 *   1. Brass Plaque, Kingdom of Benin (16th–17th century) — Ethnological Museum Berlin
 *   2. Standing Oba, Kingdom of Benin (late 18th century) — Kimbell Art Museum
 *   3. Benin Bronze Bust — Public Domain
 *
 * Image sources: Wikimedia Commons.
 *   Image 1: CC0 1.0 Universal Public Domain Dedication (Photographer: Daderot)
 *   Image 2: Public Domain CC Mark 1.0 (Photographer: FA2010, Kimbell Art Museum)
 *   Image 3: Public Domain
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/8/85/Benin_plaque_in_the_Ethnological_Museum%2C_Berlin_-_063.JPG';
const IMAGE_1_CAPTION =
  'Brass plaque from the Kingdom of Benin, 16th to 17th century, now held at the Ethnological Museum in Berlin. These plaques recorded the history and court life of Benin with extraordinary detail — cast by the Igun Eronmwon guild on Igun Street, Benin City. Photo: Daderot via Wikimedia Commons (CC0 1.0 Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/7/72/Africa_Benin_Standing_Oba_Kimbell.jpg';
const IMAGE_2_CAPTION =
  'Standing Oba figure, Kingdom of Benin, late 18th century, held at the Kimbell Art Museum. The Oba was the divine king at the centre of Benin political and spiritual life. These royal figures were cast in brass using the lost wax technique mastered by the Igun Eronmwon guild. Photo: FA2010 via Wikimedia Commons (Public Domain).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/16/Benin_Bronze.JPG';
const IMAGE_3_CAPTION =
  'Benin Bronze bust, one of thousands of artifacts taken during the 1897 British punitive expedition that looted Benin City. These bronzes are not merely art — they are Nigeria\'s stolen history books, and their return is one of the great cultural justice stories of our time. Photo: Wikimedia Commons (Public Domain).';

const POST_BODY = `In 1897, British Soldiers Carried Off Thousands of Pieces of Nigerian History. Now Nigeria Is Taking Them Back.

Around 355 AD, according to oral tradition carefully preserved over generations, the Edo people of what is now Edo State established one of the most enduring kingdoms in West African history. What began on those fertile plains would grow, over the next sixteen centuries, into a civilisation of extraordinary sophistication. When Europeans first encountered the art it produced, many could not believe Africans had made it. (Source: ThinkAfrica)

The kingdom's earliest rulers were the Ogisos, known as the Sky Kings. For hundreds of years, 31 Ogiso rulers governed the Edo people, building a city and a culture shaped by law, ceremony, and an identity deeply rooted in the land. Then, around 1200 AD, power shifted to a new dynasty: the Obas. Under the Obas, Benin entered an era of remarkable growth and ambition. (Source: ThinkAfrica)

No Oba defined this era more completely than Ewuare the Great, who ruled from approximately 1440 to 1473. A warrior and city builder of remarkable vision, Ewuare oversaw the construction of vast moat and rampart systems that fortified Benin City and expanded the kingdom's territory across Edo communities and into Yoruba lands to the west. The scale of his achievements placed Benin firmly among the great powers of the medieval world. (Source: ThinkAfrica; Wikipedia)

But the true legacy of the Kingdom of Benin was not carved in territory. It was cast in bronze.

On Igun Street in Benin City, there is a guild whose craft has passed from master to apprentice for generations. The Igun Eronmwon are masters of lost wax casting, a technique in which a wax model is encased in clay, the wax melted away, and molten metal poured into the hollow to create objects of extraordinary precision and beauty. Their bronzes, plaques, and ceremonial figures recorded the history, power, and culture of the Benin royal court with the vividness of a living archive. When Portuguese traders arrived around 1485 bringing brass manillas as currency, the guild melted those rings down and turned them into some of the finest metal art the world has ever seen. The guild still works on that same street today. (Source: Historical Nigeria)

Then came 1897.

A British punitive expedition marched into Benin City, set it ablaze, and carried away thousands of artifacts — bronzes, ivories, ceremonial regalia. These were not merely beautiful objects. They were the accumulated memory of a civilisation, recorded in metal and sacred context, ripped from their home and shipped to London, Berlin, Vienna, and Boston. In museums across Europe and North America, they were displayed without acknowledgment of the civilization that created them — rather than recognized as what they actually were: Nigeria's stolen history books. (Source: British Museum; Britannica)

For over a century, the descendants of those whose history was taken asked for it back. For over a century, the answer from Western institutions was silence, slow negotiation, or conditions that never quite became action.

In 2022, the Smithsonian Institution began returning its collection of Benin Bronzes to Nigeria. Other institutions have followed. The process is slow and still far from complete. But Nigeria's stolen past is making its way home. (Source: Historical Nigeria)

The Kingdom of Benin did not wait for European contact to become great. It was already ancient when the Portuguese first arrived on its shores, already building, already creating, already casting its own story in bronze. Every artifact carried away in 1897 was a chapter torn from a living book. The bronzes do not belong in European vaults. They belong in Nigeria. They always did.

If the Benin Bronzes were fully returned to Nigeria, where would you want them to be permanently displayed: Benin City, Lagos, or Abuja? Tell us in the comments.

#BeninBronzes #NigerianHistory #KingdomOfBenin #PrecolonialAfrica #AfricanCivilization #BringThemHome #EdoHistory #NaijaHistory #AfricanHeritage #CulturalRepatriation #TheLens #NigeriaProud`;

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

  console.log('Uploading image 1 (Brass Plaque, Ethnological Museum Berlin)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Standing Oba, Kimbell Art Museum)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Benin Bronze Bust)...');
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
