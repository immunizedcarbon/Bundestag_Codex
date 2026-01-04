import React from 'react';
import { PlenarprotokollText } from '../types';
import { FileText, Calendar, Users, ChevronDown } from 'lucide-react';
import { Spinner } from './ui/Spinner';

interface ProtocolListProps {
  protocols: PlenarprotokollText[];
  onSelect: (protocol: PlenarprotokollText) => void;
  selectedId?: string;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

export const ProtocolList: React.FC<ProtocolListProps> = ({
  protocols,
  onSelect,
  selectedId,
  onLoadMore,
  hasMore,
  loadingMore,
}) => {
  if (protocols.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>Keine Protokolle gefunden. Bitte Suchkriterien anpassen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="grid gap-4 grid-cols-1">
        {protocols.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            className={`group relative p-5 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:border-bundestag-400 ${
              selectedId === p.id ? 'bg-bundestag-50 border-bundestag-500 ring-1 ring-bundestag-500' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                {p.dokumentnummer}
              </span>
              <div className="flex items-center text-slate-500 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(p.datum).toLocaleDateString('de-DE')}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-bundestag-700 line-clamp-2">
              {p.titel}
            </h3>

            <div className="flex items-center text-slate-500 text-sm mt-3">
              <Users className="w-4 h-4 mr-1.5" />
              <span>{p.herausgeber} - Wahlperiode {p.wahlperiode}</span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loadingMore ? (
            <Spinner className="text-slate-600" />
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ältere Protokolle laden
            </>
          )}
        </button>
      )}
    </div>
  );
};
