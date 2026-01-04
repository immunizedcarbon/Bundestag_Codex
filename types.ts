// Bundestag API Types based on provided OpenAPI Spec

export interface Fundstelle {
  id: string;
  dokumentart: 'Drucksache' | 'Plenarprotokoll';
  dokumentnummer: string;
  datum: string;
  pdf_url?: string;
  xml_url?: string;
}

export interface PlenarprotokollText {
  id: string;
  dokumentart: 'Plenarprotokoll';
  typ: string;
  dokumentnummer: string;
  wahlperiode: number;
  datum: string;
  titel: string;
  text: string; // The full text content
  fundstelle: Fundstelle;
  herausgeber: string;
}

export interface PlenarprotokollTextListResponse {
  numFound: number;
  cursor?: string;
  documents: PlenarprotokollText[];
}

export interface SearchParams {
  wahlperiode: number;
  startDatum?: string;
  endDatum?: string;
  suchbegriff?: string;
  cursor?: string;
}

export type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'error';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  thoughts?: string; // For showing Gemini 3.0 thinking process
  timestamp: number;
}

export interface AnalysisCache {
  [protocolId: string]: {
    summary?: string;
    deepAnalysis?: {
      text: string;
      thoughts?: string;
    };
  };
}

export interface ApiKeys {
  bundestagKey: string;
  geminiKey: string;
}

export type GeminiModel = 'gemini-3.0-flash' | 'gemini-3.0-pro';
