import React, { useEffect, useState } from 'react';
import { Search, Settings, AlertCircle, Menu, X, CheckCircle2, ExternalLink, Database, ShieldCheck } from 'lucide-react';
import { PlenarprotokollText, ApiKeys, SearchParams, AnalysisCache } from './types';
import { fetchProtocols, verifyBundestagKey } from './services/bundestag';
import { ProtocolList } from './components/ProtocolList';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Spinner } from './components/ui/Spinner';
import { verifyGeminiKey } from './services/gemini';

const DEFAULT_BUNDESTAG_KEY = 'OSOegLs.PR2lwJ1dwCeje9vTj7FPOt3hvpYKtwKkhw';
const LS_KEYS = {
  bundestag: 'bundestag_api_key',
  gemini: 'gemini_api_key',
};

const App: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    bundestagKey: DEFAULT_BUNDESTAG_KEY,
    geminiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [protocols, setProtocols] = useState<PlenarprotokollText[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selectedProtocol, setSelectedProtocol] = useState<PlenarprotokollText | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<AnalysisCache>({});
  const [searchParams, setSearchParams] = useState<SearchParams>({
    wahlperiode: 21,
    startDatum: '',
    endDatum: '',
    suchbegriff: '',
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState(false);
  const [verificationResult, setVerificationResult] = useState<
    | { bundestag: boolean; flash: boolean; pro: boolean; message?: string; timestamp: number }
    | null
  >(null);

  // Load stored keys
  useEffect(() => {
    const storedBundestag = localStorage.getItem(LS_KEYS.bundestag);
    const storedGemini = localStorage.getItem(LS_KEYS.gemini);
    setApiKeys((prev) => ({
      bundestagKey: storedBundestag || prev.bundestagKey,
      geminiKey: storedGemini || prev.geminiKey,
    }));
  }, []);

  const persistKeys = (keys: ApiKeys) => {
    localStorage.setItem(LS_KEYS.bundestag, keys.bundestagKey);
    localStorage.setItem(LS_KEYS.gemini, keys.geminiKey);
  };

  const updateCache = (id: string, data: Partial<AnalysisCache[string]>) => {
    setAnalysisCache((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...data },
    }));
  };

  const handleSearch = async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCursor(undefined);
    }
    setError(null);

    try {
      const params = isLoadMore ? { ...searchParams, cursor } : searchParams;
      const data = await fetchProtocols(apiKeys.bundestagKey, params);
      if (data && data.documents) {
        if (isLoadMore) {
          setProtocols((prev) => [...prev, ...data.documents]);
        } else {
          setProtocols(data.documents);
          if (data.documents.length > 0 && window.innerWidth > 768) {
            setSelectedProtocol(data.documents[0]);
          }
        }
        setCursor(data.cursor);
        if (!isLoadMore && data.documents.length === 0) {
          setError('Keine Protokolle für diese Kriterien gefunden.');
        }
      } else {
        setError('Unerwartetes Antwortformat von der API.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verbindungsfehler zur Bundestag API.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleVerifyGemini = async () => {
    if (!apiKeys.geminiKey || !apiKeys.bundestagKey) return;
    setVerifyingKey(true);
    try {
      const [bundestagOk, gemini] = await Promise.all([
        verifyBundestagKey(apiKeys.bundestagKey),
        verifyGeminiKey(apiKeys.geminiKey),
      ]);
      setVerificationResult({
        bundestag: bundestagOk,
        flash: gemini.flash,
        pro: gemini.pro,
        message: gemini.message,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      setVerificationResult({
        bundestag: false,
        flash: false,
        pro: false,
        message: error.message,
        timestamp: Date.now(),
      });
    } finally {
      setVerifyingKey(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys.bundestagKey]);

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans">
      <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 -ml-2 text-slate-600"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-bundestag-700 to-bundestag-500 text-white p-1.5 rounded-lg shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Bundestag<span className="text-bundestag-600">AI</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Protocol Analyst</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {verificationResult && (
            <div
              className={`hidden md:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
                verificationResult.flash && verificationResult.pro && verificationResult.bundestag
                  ? 'border-green-200 text-green-700 bg-green-50'
                  : 'border-amber-200 text-amber-700 bg-amber-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Dienste
              {verificationResult.flash && verificationResult.pro && verificationResult.bundestag
                ? ' validiert'
                : ' noch prüfen'}
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded-full transition-colors ${
              !apiKeys.bundestagKey || !apiKeys.geminiKey
                ? 'bg-red-50 text-red-600 ring-2 ring-red-100 animate-pulse'
                : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="API Konfiguration"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside
          className={`
      absolute md:relative z-10 h-full w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sucheinstellungen</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={searchParams.wahlperiode}
                  onChange={(e) => setSearchParams({ ...searchParams, wahlperiode: parseInt(e.target.value) })}
                  className="w-full appearance-none p-2.5 pl-3 pr-8 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-bundestag-500/20 focus:border-bundestag-500 outline-none shadow-sm cursor-pointer"
                >
                  <option value={21}>21. WP (Aktuell)</option>
                  <option value={20}>20. WP</option>
                  <option value={19}>19. WP</option>
                  <option value={18}>18. WP</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Thema oder ID..."
                value={searchParams.suchbegriff || ''}
                onChange={(e) => setSearchParams({ ...searchParams, suchbegriff: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(false)}
                className="w-full p-2.5 pl-9 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-bundestag-500/20 focus:border-bundestag-500 outline-none shadow-sm"
              />
            </div>
            <button
              onClick={() => handleSearch(false)}
              disabled={loading}
              className="w-full bg-bundestag-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-bundestag-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transform duration-100"
            >
              {loading ? <Spinner className="text-white" /> : 'Protokolle laden'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin bg-slate-50">
            {error && (
              <div className="m-2 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 shadow-sm">
                <p className="font-semibold mb-1">Fehler beim Laden:</p>
                {error}
              </div>
            )}
            <ProtocolList
              protocols={protocols}
              selectedId={selectedProtocol?.id}
              onSelect={(p) => {
                setSelectedProtocol(p);
                setIsSidebarOpen(false);
              }}
              onLoadMore={() => handleSearch(true)}
              hasMore={!!cursor}
              loadingMore={loadingMore}
            />
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full w-full bg-slate-100 p-4 md:p-6 overflow-hidden relative">
          {selectedProtocol ? (
            <div className="h-full flex gap-6 flex-col xl:flex-row">
              <div className="hidden xl:flex w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-700 text-sm">Originaldokument</h3>
                </div>
                <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                  <div className="mb-6">
                    <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-mono mb-2">
                      {selectedProtocol.dokumentnummer}
                    </span>
                    <h1 className="text-lg font-bold text-slate-900 leading-snug mb-2">{selectedProtocol.titel}</h1>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{new Date(selectedProtocol.datum).toLocaleDateString('de-DE')}</span>
                      <span>•</span>
                      <span>{selectedProtocol.herausgeber}</span>
                    </div>
                  </div>

                  <div className="prose prose-xs prose-slate max-w-none font-serif text-slate-600">
                    {selectedProtocol.text.substring(0, 1500)}...
                  </div>

                  {selectedProtocol.fundstelle?.pdf_url && (
                    <a
                      href={selectedProtocol.fundstelle.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      PDF Öffnen
                    </a>
                  )}
                </div>
              </div>

              <div className="flex-1 h-full min-w-0">
                <AnalysisPanel protocol={selectedProtocol} apiKeys={{ geminiKey: apiKeys.geminiKey }} cache={analysisCache} onUpdateCache={updateCache} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-32 h-32 bg-white rounded-full shadow-lg flex items-center justify-center mb-8 ring-8 ring-slate-200/50">
                <Database className="w-12 h-12 text-bundestag-500" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">Bundestag AI Analyst</h2>
              <p className="text-slate-500 max-w-lg text-lg">
                Wählen Sie links ein Plenarprotokoll aus, um die KI-gestützte Analyse durchzuführen.
                Wir nutzen <span className="font-semibold text-bundestag-600">Gemini 3 Pro & Flash</span> für präzise Einblicke.
              </p>
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Systemkonfiguration</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bundestag DIP API Key</label>
                <input
                  type="text"
                  value={apiKeys.bundestagKey}
                  onChange={(e) => setApiKeys({ ...apiKeys, bundestagKey: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-bundestag-500/20 focus:border-bundestag-500 outline-none font-mono text-sm bg-slate-50"
                />
                <p className="text-xs text-slate-400 mt-1">Wird für den Abruf der Protokolle benötigt.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini API Key</label>
                  {verificationResult && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Zuletzt geprüft {new Date(verificationResult.timestamp).toLocaleTimeString('de-DE')}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={apiKeys.geminiKey}
                  onChange={(e) => setApiKeys({ ...apiKeys, geminiKey: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-bundestag-500/20 focus:border-bundestag-500 outline-none font-mono text-sm bg-slate-50"
                />
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Erforderlich für Gemini 3 Pro & Flash Features. Nur 3.x Modelle werden genutzt.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleVerifyGemini}
                    disabled={!apiKeys.geminiKey || verifyingKey}
                    className="px-4 py-2 bg-bundestag-600 text-white rounded-lg text-sm font-semibold hover:bg-bundestag-700 transition-colors flex items-center gap-2"
                  >
                    {verifyingKey ? <Spinner className="text-white" /> : <ShieldCheck className="w-4 h-4" />}
                    Key prüfen
                  </button>
                  {verificationResult && (
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className={`w-3 h-3 ${verificationResult.bundestag ? 'text-green-600' : 'text-red-500'}`} />
                        Bundestag API
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className={`w-3 h-3 ${verificationResult.flash ? 'text-green-600' : 'text-red-500'}`} />
                        Flash 3.0
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className={`w-3 h-3 ${verificationResult.pro ? 'text-green-600' : 'text-red-500'}`} />
                        Pro 3.0
                      </div>
                      {verificationResult.message && (
                        <p className="text-[11px] text-red-600">{verificationResult.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                Änderungen werden lokal gespeichert. Schlüssel werden niemals an Dritte gesendet.
              </div>
              <button
                onClick={() => {
                  persistKeys(apiKeys);
                  setShowSettings(false);
                }}
                className="px-6 py-2.5 bg-bundestag-600 text-white rounded-xl font-semibold hover:bg-bundestag-700 transition-colors flex items-center gap-2 shadow-lg shadow-bundestag-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
