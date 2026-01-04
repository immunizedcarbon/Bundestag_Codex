import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PlenarprotokollText, ChatMessage, AnalysisCache } from '../types';
import { createProtocolChat, generateDeepAnalysis, generateFastSummary } from '../services/gemini';
import { Spinner } from './ui/Spinner';
import { Sparkles, MessageSquare, FileText, Send, BrainCircuit, ChevronDown, ChevronRight, Microscope, Zap, PlayCircle } from 'lucide-react';
import { Chat } from '@google/genai';

interface AnalysisPanelProps {
  protocol: PlenarprotokollText;
  apiKeys: { geminiKey: string };
  cache: AnalysisCache;
  onUpdateCache: (id: string, data: Partial<AnalysisCache[string]>) => void;
}

type Mode = 'overview' | 'investigator';

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ protocol, apiKeys, cache, onUpdateCache }) => {
  const [mode, setMode] = useState<Mode>('overview');
  const [loadingAction, setLoadingAction] = useState<'summary' | 'deep' | 'chat' | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({});

  const currentCache = cache[protocol.id] || {};

  useEffect(() => {
    setChatSession(null);
    setMessages([]);
    setMode('overview');
    setLoadingAction(null);
    setExpandedThoughts({});
  }, [protocol.id]);

  useEffect(() => {
    if (mode === 'investigator') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  const handleGenerateSummary = async () => {
    if (!protocol.text) return;
    setLoadingAction('summary');
    try {
      const summary = await generateFastSummary(protocol.text, apiKeys.geminiKey);
      onUpdateCache(protocol.id, { summary });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeepAnalysis = async () => {
    if (!protocol.text) return;
    setLoadingAction('deep');
    try {
      const result = await generateDeepAnalysis(protocol.text, apiKeys.geminiKey);
      onUpdateCache(protocol.id, { deepAnalysis: result });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !protocol.text) return;
    if (!apiKeys.geminiKey) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Fehler: Bitte geben Sie zuerst einen gültigen Gemini API Key in den Einstellungen ein.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoadingAction('chat');

    try {
      let session = chatSession;
      if (!session) {
        session = await createProtocolChat(protocol.text, apiKeys.geminiKey);
        setChatSession(session);
      }

      const response = await session.sendMessage({ message: userMsg.text });
      const thoughts = (response as any)?.candidates?.[0]?.content?.parts?.find((p: any) => 'thought' in p && p.thought === true)?.text;

      const botMsg: ChatMessage = {
        role: 'model',
        text: response.text || 'Keine Antwort erhalten.',
        thoughts,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || 'Unbekannter Fehler';
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **Verarbeitungsfehler**: ${errorMessage}\n\nMögliche Ursachen:\n- API Key ungültig\n- Modell überlastet (503)\n- Text zu lang für das Modell\n\nBitte versuchen Sie es erneut.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoadingAction(null);
    }
  };

  const toggleThoughts = (index: number) => {
    setExpandedThoughts((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-bundestag-100 p-2 rounded-lg text-bundestag-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Analyse-Zentrum</h2>
            <p className="text-xs text-slate-500">Protokoll {protocol.dokumentnummer}</p>
          </div>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setMode('overview')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'overview' ? 'bg-white text-bundestag-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Übersicht
          </button>
          <button
            onClick={() => setMode('investigator')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
              mode === 'investigator' ? 'bg-white text-bundestag-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            Investigator
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-50">
        {mode === 'overview' && (
          <div className="absolute inset-0 overflow-y-auto p-6 scrollbar-thin space-y-6">
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-bundestag-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Executive Summary (Flash 3.0)
                </h3>
                {currentCache.summary && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Generiert</span>
                )}
              </div>

              {currentCache.summary ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600">
                  <ReactMarkdown>{currentCache.summary}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
                  <FileText className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 mb-4 text-center max-w-xs">
                    Erstellen Sie eine schnelle Zusammenfassung der Top-Themen und Beschlüsse.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={loadingAction === 'summary'}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-bundestag-600 hover:border-bundestag-200 transition-all shadow-sm flex items-center gap-2"
                  >
                    {loadingAction === 'summary' ? <Spinner /> : <PlayCircle className="w-4 h-4" />}
                    Zusammenfassung generieren
                  </button>
                </div>
              )}
            </section>

            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm ring-1 ring-bundestag-100 transition-all hover:ring-bundestag-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-bundestag-600 uppercase tracking-wider flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  Tiefenanalyse (Gemini 3 Pro)
                </h3>
                {currentCache.deepAnalysis && (
                  <span className="text-[10px] bg-bundestag-100 text-bundestag-700 px-2 py-0.5 rounded-full font-medium">Analysiert</span>
                )}
              </div>

              {currentCache.deepAnalysis ? (
                <div className="space-y-4">
                  {currentCache.deepAnalysis.thoughts && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleThoughts(-1)}
                        className="w-full flex items-center justify-between p-3 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <BrainCircuit className="w-3.5 h-3.5" />
                          Gedankengang anzeigen
                        </span>
                        {expandedThoughts[-1] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {expandedThoughts[-1] && (
                        <div className="p-3 border-t border-slate-200 text-xs font-mono text-slate-600 bg-slate-50/50 whitespace-pre-wrap">
                          {currentCache.deepAnalysis.thoughts}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none prose-headings:text-bundestag-900">
                    <ReactMarkdown>{currentCache.deepAnalysis.text}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-bundestag-100 rounded-lg bg-bundestag-50/30">
                  <Sparkles className="w-12 h-12 text-bundestag-200 mb-3" />
                  <h4 className="text-slate-700 font-medium mb-1">Wissenschaftliche Diskursanalyse</h4>
                  <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
                    Nutzen Sie die "Thinking"-Fähigkeiten von Gemini 3 Pro, um Rhetorik, Framing und implizite Signale zu untersuchen.
                  </p>
                  <button
                    onClick={handleDeepAnalysis}
                    disabled={loadingAction === 'deep'}
                    className="px-6 py-2.5 bg-bundestag-600 text-white rounded-lg text-sm font-semibold hover:bg-bundestag-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    {loadingAction === 'deep' ? <Spinner className="text-white" /> : <Sparkles className="w-4 h-4" />}
                    Analyse starten
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {mode === 'investigator' && (
          <div className="absolute inset-0 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-slate-50/30">
              {messages.length === 0 && (
                <div className="text-center mt-10 space-y-3">
                  <div className="w-12 h-12 bg-bundestag-100 rounded-full flex items-center justify-center mx-auto text-bundestag-600">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800">Stellen Sie Fragen an das Protokoll</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Der Investigator lädt das <b>gesamte Dokument</b> in den Kontext von Gemini 3 Pro.
                    Dies verbraucht mehr Tokens, ermöglicht aber präzise Detailfragen.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {['Welche Anträge wurden angenommen?', 'Wie war die Stimmung bei der Rede von Scholz?', 'Fasse die Kritik der Opposition zusammen'].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:border-bundestag-400 hover:text-bundestag-600 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-bundestag-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.thoughts && (
                      <div className="mb-2 pb-2 border-b border-slate-100/20">
                        <button onClick={() => toggleThoughts(idx)} className="text-xs opacity-70 flex items-center gap-1 hover:opacity-100">
                          <BrainCircuit className="w-3 h-3" />
                          {expandedThoughts[idx] ? 'Gedanken verbergen' : 'Gedanken anzeigen'}
                        </button>
                        {expandedThoughts[idx] && (
                          <div className="mt-2 text-xs font-mono opacity-90 bg-black/5 p-2 rounded max-h-60 overflow-y-auto">
                            {msg.thoughts}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loadingAction === 'chat' && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                    <Spinner className="text-bundestag-500" />
                    <span className="text-xs text-slate-400 font-medium animate-pulse">Gemini 3 Pro liest das Dokument und denkt nach...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Nachricht an Gemini 3 Pro..."
                  disabled={loadingAction === 'chat'}
                  className="flex-1 py-3 pl-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bundestag-500/20 focus:border-bundestag-500 transition-all text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loadingAction === 'chat'}
                  className="absolute right-2 p-2 bg-bundestag-600 text-white rounded-lg hover:bg-bundestag-700 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
