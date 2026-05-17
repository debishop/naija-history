/**
 * Publish script — When 276 Girls Shook the World: The Day Paris Declared War on Boko Haram
 * (The Lens Facebook Page, Today in Nigeria History — Saturday May 17, 2026)
 *
 * Two-image gallery post. Image order:
 *   1. #BringBackOurGirls Protest Truck, Abuja (Medina Dauda/VOA, April 30, 2014)
 *   2. Parents of Chibok Kidnapping Victims (VOA, April 28, 2014)
 *
 * Images: Wikimedia Commons. Both Public Domain (U.S. federal government works via VOA).
 */
import * as dotenv from 'dotenv';
dotenv.config();

const GRAPH_API_VERSION = process.env['FACEBOOK_GRAPH_API_VERSION'] ?? 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const IMAGE_1_URL =
  'https://upload.wikimedia.org/wikipedia/commons/1/15/BringBackOurGirls_truck.jpg';
const IMAGE_1_CAPTION =
  '#BringBackOurGirls Protest Truck at a rally in Abuja, Nigeria, April 30, 2014. The hashtag was retweeted 6.1 million times worldwide. Photo: Medina Dauda/VOA via Wikimedia Commons (Public Domain).';

const IMAGE_2_URL =
  'https://upload.wikimedia.org/wikipedia/commons/4/46/Parents_of_Chibok_kidnapping_victims.png';
const IMAGE_2_CAPTION =
  'Parents of some of the 276 kidnapped Chibok schoolgirls mourn their losses, April 28, 2014. Photo: VOA via Wikimedia Commons (Public Domain).';

const POST_BODY = `WHEN 276 GIRLS SHOOK THE WORLD

The Day Paris Declared War on Boko Haram

On the morning of April 14, 2014, students at Government Girls Secondary School in Chibok, Borno State, sat for their final exams. They had no idea it would be their last night of childhood. By dawn the next day, 276 of them had been taken into the dark forests of the northeast, abducted by Boko Haram in one of the most shocking mass kidnappings of the modern era. (Source: Wikipedia; CNN)

The name of Boko Haram's leader, Abubakar Shekau, became synonymous with brutality when he appeared in a video on May 5, 2014, claiming responsibility for the abduction and threatening to sell the girls into slavery. He laughed as he said it. The world watched, first in disbelief, then in fury. (Source: Wikipedia)

But the world also fought back.

From Lagos to London, from Washington to Johannesburg, people picked up their phones and typed three words that would circle the globe: BringBackOurGirls. The hashtag, first posted by Nigerian lawyer Ibrahim M. Abdullahi, was retweeted 6.1 million times, sparking global protests and pulling the story onto the front pages of every major newspaper on earth. (Source: The Conversation)

Mothers marched. Vigils burned through the night. The violence in Nigeria's northeast could no longer be treated as a distant or regional matter. Chibok had made it personal for millions of people who had never set foot on the African continent. (Source: CNN; Al Jazeera)

Then came Paris.

On May 17, 2014, French President François Hollande convened an emergency security summit at the Elysée Palace. The urgency was unmistakable. Sitting at that table were Nigerian President Goodluck Jonathan, Cameroonian President Paul Biya, British Foreign Secretary William Hague, and senior representatives from the United States, the European Union, Benin, Chad, and Niger. (Source: CNN; Al Jazeera)

The message from Paris was direct and unsparing. President Biya stood and declared: "We are here to declare war on Boko Haram." Hollande was equally direct: "It is serious, it is dangerous, for Africa and the rest of the world." A stark acknowledgment that the international community had underestimated the danger for too long. (Source: Al Jazeera; NBC News)

The summit produced real commitments. Five nations formally agreed to pool intelligence, coordinate military patrols along shared borders, and build dedicated channels for tracking Boko Haram operations across the region. It was the first structured multinational response targeting the group directly, and it existed because 276 girls had forced the world to pay attention. (Source: CNN; NBC News)

Yet the story did not end in triumph.

Despite the global protests, the summits, the soldiers, and years of negotiations, 96 of the Chibok girls remained unaccounted for as of 2024. Ten years after the abduction, their families were still waiting. A Human Rights Watch report published in April 2024 confirmed that children across northeastern Nigeria remain at acute risk and that the conditions behind the 2014 kidnapping have not been fully resolved. (Source: Human Rights Watch; UNICEF)

The legacy of Chibok and of the Paris Summit is therefore unfinished. The movement it sparked reshaped how the world responds to terror and mass atrocity, demonstrating the raw power of collective grief channelled through social media. But it also exposed the distance between political declarations and lasting justice for real people. (Source: The Conversation)

Today, on May 17, we remember what that summit represented: the moment the global community turned its eyes to Nigeria and said, "We see you." We also remember those who are still waiting to be seen.

What do you think the world owes the Chibok girls and their families, more than a decade on? Share your thoughts in the comments.

#NigerianHistory #TodayInHistory #ChibokGirls #BringBackOurGirls #BokoHaram #NeverForget #AfricanHistory #May17 #ChibokAt10 #NigeriaStrong #OurGirls`;

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

  console.log('Uploading image 1 (#BringBackOurGirls Protest Truck)...');
  const photoId1 = await uploadPhoto(pageId, pageToken, IMAGE_1_URL, IMAGE_1_CAPTION);
  console.log(`Image 1 uploaded: ${photoId1}`);

  console.log('Uploading image 2 (Parents of Chibok victims)...');
  const photoId2 = await uploadPhoto(pageId, pageToken, IMAGE_2_URL, IMAGE_2_CAPTION);
  console.log(`Image 2 uploaded: ${photoId2}`);

  console.log('Publishing post with two-image gallery...');
  const postId = await publishWithPhotos(pageId, pageToken, [photoId1, photoId2]);

  const postUrl = `https://www.facebook.com/${postId}`;
  console.log(`Published: ${postUrl}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
