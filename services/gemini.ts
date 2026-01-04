import { Chat, GoogleGenAI, Tool } from '@google/genai';
import { GeminiModel } from '../types';

type DeepAnalysis = { text: string; thoughts?: string };

const SUPPORTED_MODELS: Record<'flash' | 'pro', GeminiModel> = {
  flash: 'gemini-3.0-flash',
  pro: 'gemini-3.0-pro',
};

const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!key) throw new Error('Gemini API Key fehlt. Bitte in den Einstellungen hinterlegen.');
  return new GoogleGenAI({ apiKey: key, apiVersion: 'v1' });
};

const truncateText = (text: string) =>
  text.length > 1_500_000
    ? `${text.substring(0, 1_500_000)}... [Text gekürzt bei 1.5 Mio Zeichen]`
    : text;

const extractThoughts = (response: any): string | undefined => {
  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.find((p: any) => 'thought' in p && p.thought === true);
  return part?.text;
};

export const verifyGeminiKey = async (
  apiKey: string,
): Promise<{ flash: boolean; pro: boolean; message?: string }> => {
  const client = getClient(apiKey);
  try {
    const [flashResult, proResult] = await Promise.all([
      client.models.generateContent({
        model: SUPPORTED_MODELS.flash,
        contents: 'Sag nur "ok"',
      }),
      client.models.generateContent({
        model: SUPPORTED_MODELS.pro,
        contents: 'Sag nur "ok"',
      }),
    ]);

    return {
      flash: !!flashResult.text,
      pro: !!proResult.text,
    };
  } catch (error: any) {
    const message =
      error?.message?.includes('not found') || error?.message?.includes('NOT_FOUND')
        ? 'Gemini 3.0 Modelle sind für diese API-Version/Region nicht verfügbar. Bitte API-Key und Zugriffsrechte prüfen.'
        : error.message;
    return { flash: false, pro: false, message };
  }
};

export const generateFastSummary = async (text: string, apiKey?: string): Promise<string> => {
  const client = getClient(apiKey);
  const prompt = [
    'Du bist ein spezialisierter Parlaments-Analyst. Erstelle eine prägnante Executive Summary des folgenden Plenarprotokolls.',
    '',
    'Struktur:',
    '',
    'Top-Themen: Die 3-5 wichtigsten Debattenpunkte.',
    'Beschlüsse: Konkrete Gesetzesverabschiedungen oder Anträge (Ergebnis).',
    'Konfliktlinien: Wer stand gegen wen? (Kurz).',
    'Protokolltext:',
    truncateText(text),
  ].join('\n');

  try {
    const response = await client.models.generateContent({
      model: SUPPORTED_MODELS.flash,
      contents: prompt,
      config: {
        temperature: 0.3,
      },
    });
    return response.text || 'Keine Zusammenfassung generiert.';
  } catch (error: any) {
    console.error('Gemini Summary Error:', error);
    return 'Zusammenfassung konnte nicht erstellt werden (API Fehler).';
  }
};

export const generateDeepAnalysis = async (text: string, apiKey?: string): Promise<DeepAnalysis> => {
  const client = getClient(apiKey);
  const prompt = [
    'Führe eine wissenschaftliche Diskursanalyse dieses Protokolls durch.',
    '',
    'Untersuchungsaspekte:',
    '',
    'Rhetorische Strategien: Welche Argumentationsmuster nutzen Regierung vs. Opposition?',
    'Framing: Wie werden Schlüsselbegriffe von verschiedenen Seiten besetzt?',
    'Implizite Signale: Was steht zwischen den Zeilen (Zwischenrufe, Heiterkeit)?',
    'Gehe methodisch vor und belege deine Thesen kurz am Text.',
    '',
    'Protokolltext:',
    truncateText(text),
  ].join('\n');

  try {
    const response = await client.models.generateContent({
      model: SUPPORTED_MODELS.pro,
      contents: prompt,
      config: {
        systemInstruction:
          'Du bist ein promovierter Politikwissenschaftler. Du analysierst objektiv, scharfsinnig und strukturierst deine Ergebnisse akademisch präzise.',
        thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 },
        temperature: 0.2,
      },
    });

    return {
      text: response.text || 'Keine Analyse generiert.',
      thoughts: extractThoughts(response),
    };
  } catch (error: any) {
    console.error('Gemini Analysis Error:', error);
    throw new Error('Fehler bei der Tiefenanalyse: ' + error.message);
  }
};

export const createProtocolChat = async (text: string, apiKey?: string): Promise<Chat> => {
  const client = getClient(apiKey);
  const tools: Tool[] = [{ googleSearch: {} }];

  return client.chats.create({
    model: SUPPORTED_MODELS.pro,
    config: {
      tools,
      thinkingConfig: { includeThoughts: true, thinkingBudget: 2048 },
      systemInstruction: [
        'Du bist ein forensischer Investigator für Bundestagsprotokolle.',
        '',
        'Regeln:',
        '1. Du hast den VOLLSTÄNDIGEN Text des Protokolls im Kontext. Nutze ihn primär.',
        '2. Wenn der Nutzer nach Fakten fragt, die nicht im Text stehen, nutze Google Search.',
        '3. Denke kritisch nach (Thinking Process), bevor du antwortest.',
        '4. Sei präzise, zitiere wenn möglich indirekt Sprecher aus dem Protokoll.',
        '',
        'Protokoll Kontext:',
        truncateText(text),
      ].join('\n'),
      temperature: 0.4,
    },
  });
};
