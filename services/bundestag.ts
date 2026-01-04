import { PlenarprotokollTextListResponse, SearchParams } from '../types';

const BASE_URL = 'https://search.dip.bundestag.de/api/v1';
const PROXY_URL = 'https://corsproxy.io/?';

/**
 * Smart Fetch wrapper that handles CORS issues by falling back to a proxy
 * and uses Query Param auth which is more proxy-friendly than headers.
 */
async function smartFetch(url: string, apiKey: string): Promise<any> {
  const urlObj = new URL(url);
  urlObj.searchParams.append('apikey', apiKey);
  const targetUrl = urlObj.toString();

  try {
    const response = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) return response.json();
  } catch (e) {
    console.warn('Direct fetch failed (likely CORS), switching to Proxy strategy...');
  }

  const proxyTarget = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyTarget, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`API Fehler via Proxy: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Proxy fetch failed:', error);
    throw new Error(
      'Verbindung zum Bundestag konnte nicht hergestellt werden. Bitte prüfen Sie Ihre Internetverbindung.',
    );
  }
}

export const fetchProtocols = async (
  apiKey: string,
  params: SearchParams,
): Promise<PlenarprotokollTextListResponse> => {
  const url = new URL(`${BASE_URL}/plenarprotokoll-text`);

  url.searchParams.append('f.wahlperiode', params.wahlperiode.toString());
  url.searchParams.append('format', 'json');
  url.searchParams.append('limit', '20');

  if (params.startDatum) {
    url.searchParams.append('f.datum.start', params.startDatum);
  }
  if (params.endDatum) {
    url.searchParams.append('f.datum.end', params.endDatum);
  }

  if (params.suchbegriff) {
    url.searchParams.append('f.titel', params.suchbegriff);
  }

  if (params.cursor) {
    url.searchParams.append('cursor', params.cursor);
  }

  return smartFetch(url.toString(), apiKey);
};

export const getProtocolById = async (apiKey: string, id: string) => {
  const url = `${BASE_URL}/plenarprotokoll-text/${id}?format=json`;
  return smartFetch(url, apiKey);
};

export const verifyBundestagKey = async (apiKey: string): Promise<boolean> => {
  const url = new URL(`${BASE_URL}/plenarprotokoll-text`);
  url.searchParams.append('f.wahlperiode', '21');
  url.searchParams.append('limit', '1');
  url.searchParams.append('format', 'json');
  await smartFetch(url.toString(), apiKey);
  return true;
};
