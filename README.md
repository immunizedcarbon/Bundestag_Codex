# Bundestag Codex

Eine moderne React/Vite-Anwendung zum Durchsuchen und Analysieren von Plenarprotokollen des Deutschen Bundestages. 

## Features
- Suche nach Plenarprotokollen (mit Cursor-Pagination) über die offizielle DIP-API
- Speicherung von Bundestag- und Gemini-API-Schlüsseln in `localStorage`
- Verifikation des Gemini-API-Keys gegen **Gemini 3.0 Flash** und **Gemini 3.0 Pro**
- KI-gestützte Executive Summary (Flash) und Tiefenanalyse inkl. Thinking-Trace (Pro)
- Investigator-Chat mit vollständigem Dokumentenkontext und optionalem Google-Suchtool
- Responsive, moderne UI auf Basis von Tailwind

## Setup
1. Node.js installieren
2. Abhängigkeiten installieren
   ```bash
   npm install
   ```
3. In `.env.local` den Gemini-Schlüssel hinterlegen (oder später in der UI eintragen):
   ```env
   GEMINI_API_KEY=DEIN_KEY
   ```
4. Entwicklung starten
   ```bash
   npm run dev
   ```

## Build
```bash
npm run build
```

## Hinweise
- Nur Gemini 3.x Modelle werden verwendet (Flash & Pro).
- Schlüssel werden ausschließlich lokal gespeichert.
