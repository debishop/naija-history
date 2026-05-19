/**
 * Publish script — The Battle of Imagbon (Today in Nigeria History)
 * (The Lens Facebook Page, Today in Nigeria History — Monday May 19, 2026)
 *
 * Three-image gallery post. Image order:
 *   1. Ladies of Lagos in Fancy Ball Dresses, 1890 — Public Domain
 *   2. Yoruba wooden panels from Ijebu-Ode, ca. 1890 — CC BY 3.0 (Sailko)
 *   3. Captain Frederick Lugard with Maxim Gun, Kampala, 1891 — CC BY-SA 4.0 (Ernest Gedge / RGS)
 *
 * Image sources: Wikimedia Commons.
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/e/e8/Ladies_of_Lagos_in_Fancy_Ball_Dresses.png';
const IMAGE_1_CAPTION =
  'Ladies of Lagos in Fancy Ball Dresses, 1890. This photograph captures Lagos society at the exact moment the Ijebu Kingdom was fighting to protect its sovereignty. Two years before the Battle of Imagbon, this was the colonial world pressing against Ijebu borders. Photo: Lutterodt Family Studios via Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/a/a2/Nigeria%2C_yoruba%2C_pannelli%2C_da_ijebu-ode%2C_1890_ca.jpg';
const IMAGE_2_CAPTION =
  'Yoruba carved wooden panels from Ijebu-Ode, Nigeria, circa 1890. These artifacts are from the very kingdom that fought the British at Imagbon in 1892, showcasing the cultural sophistication of the Ijebu people. Photo: Sailko via Wikimedia Commons (CC BY 3.0).';

const IMAGE_3_URL =
  'https://upload.wikimedia.org/wikipedia/commons/5/55/Captain_Frederick_Lugard%2C_Fenwick_de_Winton_and_William_Grant_at_Kampala%2C_Mengo_with_men_of_the_King%27s_African_Rifles_and_a_Maxim_Gun.jpg';
const IMAGE_3_CAPTION =
  'Captain Frederick Lugard (later the first Governor General of Nigeria) with a Maxim gun at Kampala, January 1891. This is the same type of weapon that devastated 8,000 Ijebu warriors at Imagbon sixteen months later, and the same officer who wrote of the carnage. Photo: Ernest Gedge / Royal Geographical Society via Wikimedia Commons (CC BY-SA 4.0).';

const POST_BODY = `8,000 Warriors. One Gun. The Day Nigeria's Mightiest Kingdom Fell.

On May 19, 1892, something happened in a small village called Imagbon that would change the fate of millions of people across Yorubaland and beyond. A kingdom that had stood for centuries, controlled the most powerful trade routes in the region, and resisted every foreign attempt at domination was destroyed in a single morning.

This is the story of the Battle of Imagbon.

The Kingdom That Refused to Bow

For decades, the Ijebu Kingdom was one of the most commercially powerful kingdoms in West Africa. Situated between Lagos and the Yoruba hinterland, the Ijebu people controlled the flow of goods across lucrative trade routes connecting the Lagos Lagoon to the interior of Nigeria (Wikipedia, Ijebu Kingdom). The Awujale, the sacred king of the Ijebu, was not a passive ruler. He was a sovereign who understood leverage, imposed customs duties, and protected his people's economic interests with fierce determination.

The British, who had turned Lagos into a Crown Colony, wanted those trade routes open. They wanted access to the Yoruba interior for commerce and for missionaries who had been repeatedly denied entry into Ijebu territory. When Awujale Adesimbo Aboki Tunwase shut down the Ejirin market, severing Lagos from trade with the interior, the British colonial administration made a decision: enough of diplomacy (GlobalSecurity.org).

The March into Ijebu Land

On May 12, 1892, Colonel F.C. Scott launched a British expeditionary force from Lagos Lagoon, landing at Epe and recruiting additional troops at Lekki. The force numbered approximately 450 soldiers drawn from Gold Coast, Sierra Leone, Ibadan, Lagos, and around 150 Hausa fighters (GlobalSecurity.org). It was a small army by any measure, but it carried something the Ijebu had never faced before.

The British column advanced into Ijebu territory, crossing the sacred Yemoyi River and burning villages along the route. On the morning of May 19, the two forces met at Imagbon village, on the western frontier of Ijebu Ode (GlobalSecurity.org).

The Day the World Changed

What waited for the British was an army of approximately 8,000 Ijebu warriors (GlobalSecurity.org). Brave, disciplined, and fighting for their homeland, they outnumbered the British column by more than fifteen to one. By any traditional calculation, they should have won.

But the British had a Maxim gun.

The Maxim gun could fire 600 rounds per minute. The Ijebu warriors, armed with older rifles and traditional weapons, had no answer for it. The battle became a massacre. More than 900 Ijebu soldiers were killed that day. The British lost 56 men (OldNaija).

Frederick Lugard, the British officer who would later become the first Governor General of a unified Nigeria, wrote of the carnage: "In the 'Jebu' war, undertaken by Government, I have been told 'several thousands' were mowed down by the Maxim" (OldNaija).

The Aftermath

When Imagbon fell, the Awujale Tunwase surrendered. The British Union Jack was raised over Ijebu Ode. A kingdom that had guarded its sovereignty for generations was absorbed into the Colony of Southern Nigeria (Wikipedia, Imagbon). This was not just the end of a war. It was the end of an era.

With the Ijebu gate broken open, Christian missionaries who had been barred for years poured into the Yoruba hinterland. Trade routes that had belonged to the Ijebu were now open to British commerce. Piece by piece, the territories that would become Nigeria were assembled under colonial rule.

The Battle of Imagbon happened 134 years ago today. The Ijebu people were not defeated because they lacked courage or strategy. They were defeated because one side brought an industrial weapon that no warrior, no matter how brave, could stand against.

That is worth remembering.

What do you think was the most significant consequence of the Battle of Imagbon for Nigeria? Share your thoughts below.

#TodayInNigerianHistory #BattleOfImagbon #NigerianHistory #IjebuHistory #YorubaHistory #ColonialHistory #WestAfricanHistory #NigeriaHeritage #AfricanHistory #ThisDayInHistory #IjebuKingdom #MaximGun #NigeriaHistory`;

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

  console.log('Uploading image 1 (Ladies of Lagos, 1890)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Yoruba wooden panels, Ijebu-Ode)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Uploading image 3 (Lugard with Maxim Gun, 1891)...');
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
