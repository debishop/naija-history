const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

export interface WikimediaImage {
  title: string;
  url: string;
  descriptionUrl: string;
}

export async function fetchRelevantImage(searchTerm: string): Promise<WikimediaImage | null> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${searchTerm} Nigeria`,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|mime',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  });

  const response = await fetch(`${WIKIMEDIA_API}?${params.toString()}`);
  if (!response.ok) return null;

  const json = (await response.json()) as WikimediaQueryResponse;
  const pages = json.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (!info.mime?.startsWith('image/')) continue;
    if (info.mime === 'image/svg+xml') continue;

    return {
      title: page.title ?? '',
      url: info.thumburl ?? info.url ?? '',
      descriptionUrl: info.descriptionurl ?? '',
    };
  }

  return null;
}

interface WikimediaQueryResponse {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
}

interface WikimediaPage {
  title?: string;
  imageinfo?: WikimediaImageInfo[];
}

interface WikimediaImageInfo {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  mime?: string;
}
