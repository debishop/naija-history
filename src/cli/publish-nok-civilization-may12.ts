/**
 * Publish script — The Nok Civilization: Nigeria's Terracotta Architects and Iron Age Pioneers
 * (The Lens Facebook Page, Precolonial Heritage — Monday May 12, 2026)
 *
 * Three-image post. Image order:
 *   1. Nok Male Terracotta Figure (hero/lead)
 *   2. Nok Terracotta Head (detail)
 *   3. Nok Terracotta Rider (closing)
 *
 * Images: Wikimedia Commons. Images 1-2: Public Domain (Kimbell Art Museum).
 * Image 3: CC BY-SA 3.0 (Ericguillouard).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/2/27/Africa_Nok_Male_Figure_Kimbell.jpg';
const IMAGE_1_CAPTION =
  'Nok Male Terracotta Figure, Northern Nigeria, c. 500 BCE to 500 CE. Kimbell Art Museum, Fort Worth, Texas. Public Domain. Source: Wikimedia Commons.';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/f/f2/Africa_Nok_Head_Kimbell.jpg';
const IMAGE_2_CAPTION =
  'Nok Terracotta Head, Northern Nigeria, c. 500 BCE to 500 CE. 32.4 x 17.2 x 17.8 cm. Kimbell Art Museum. Public Domain. Source: Wikimedia Commons.';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/0/05/A_man_ride_a_horse%2CNok_terracotta_figurine.jpg';
const IMAGE_3_CAPTION =
  'Nok Terracotta Rider, ancient figurine of a man on horseback. Photo: Ericguillouard, 2006. Source: Wikimedia Commons (CC BY-SA 3.0).';

const POST_BODY = `The Ancient Ones Who Taught Africa to Dream in Clay and Steel

Before Ife shaped its bronze masterpieces. Before Benin cast its famous plaques. Before any kingdom rose to claim the soul of what is now Nigeria, another people had already spent a thousand years rewriting what humanity could do.

Their name was Nok.

They flourished across central Nigeria from around 1500 BCE to 1 BCE, inhabiting a territory of over 75,000 square kilometres that spans modern day Kaduna, Niger, Plateau, and Nasarawa States. For some fifteen centuries, they built, farmed, smelted metal, and created art so extraordinary that scholars still argue about its full meaning. (World History Encyclopedia)

Here is how we first found them again.

In 1943, British archaeologist Bernard Fagg was in Jos when a visitor brought him a terracotta head that had been recovered from a farmer's yam field, where it had been used as a scarecrow. Fagg recognised what others had missed. He began connecting it to similar fragments that local mine workers had been unearthing by accident for years. That scarecrow, it turned out, was at least 2,500 years old. (Archaeology Magazine)

Fagg named the entire culture after the village of Nok.

What he had stumbled upon was the oldest known large scale figurative terracotta tradition in sub Saharan Africa. Hundreds of terracotta pieces have been formally documented, though scholars believe these represent only a fraction of what once existed. The sculptures are hollow, coil built, sometimes life sized, and unmistakably distinctive. They feature triangular or oval eyes pierced through to the hollow interior, finely detailed hairstyles, jewellery, and garments. Some depict seated figures. Some show warriors. Others show animals. Each one is a window into a world we are still trying to understand. (World History Encyclopedia)

But the Nok were not only artists. They were engineers.

While most ancient societies moved through a Bronze Age before reaching iron, the Nok people appear to have made a direct leap from stone tools to iron technology. This is one of the rarest transitions in documented human history. Excavations at Taruga, one of the most significant Nok sites, revealed at least 13 iron smelting furnaces dated to between the 4th and 2nd centuries BCE. The Nok were producing iron while Rome was still a republic. (Archaeology Magazine)

They also farmed. Evidence shows the Nok cultivated pearl millet and cowpea, and practised agroforestry, managing the land with great sophistication. These were not wandering groups. They were a settled, productive, and deeply creative society. (World History Encyclopedia)

The Frankfurt Nok Project, led by Peter Breunig and Nicole Rupp between 2005 and 2021, recovered approximately 90,000 potsherds and significantly advanced our understanding of Nok settlement patterns, diet, and social organisation. Their work confirmed what Fagg had suspected: that the Nok were not a single site or a single moment, but a civilisation that endured for over a thousand years. (World History Encyclopedia)

And yet, the tragedy of Nok is real. Since 1994, illegal excavations driven by the global art market have destroyed over 90% of known Nok sites. Sculptures that survived 2,500 years underground were ripped from their context, stripped of the information they carried, and sold to foreign collectors. What we have left is extraordinary. What we have lost is irreplaceable. (Archaeology Magazine)

Nok may not be a household name. But it should be. Long before any empire claimed this land, the Nok looked at iron ore and imagined fire. They looked at clay and imagined a face. They looked at the land and decided to stay.

They were here first.

And they left us proof.

What do you know about the Nok Civilization? Which part of their story surprises you the most? Drop your thoughts in the comments below.

#NokCivilization #NigerianHistory #PrecolonialAfrica #AfricanHeritage #AncientAfrica #NigerianCulture #AfricanHistory #AfricanArt #TerracottaArt #PrecolonialHeritage #HiddenHistory #AfricanPride #TheLens`;

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

  console.log('Uploading image 1 (Nok Male Figure — hero)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Nok Terracotta Head)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Nok Terracotta Rider)...');
  const photoId3 = await uploadPhoto(pageId, pageToken, IMAGE_3_URL, IMAGE_3_CAPTION);
  console.log(`Image 3 uploaded: ${photoId3}`);

  console.log('Publishing post with three images...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2, photoId3]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
