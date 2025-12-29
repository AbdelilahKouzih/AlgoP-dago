
import React from 'react';
import { QualityScore } from '../types';
import { CheckCircle2, Star, BrainCircuit, MessageCircle, Trophy } from 'lucide-react';

interface QualityScorePanelProps {
  evaluation: QualityScore;
  onClose: () => void;
}

const QualityScorePanel: React.FC<QualityScorePanelProps> = ({ evaluation, onClose }) => {
  const getSyntaxBadge = () => {
    switch (evaluation.syntax) {
      case 'correct': return { text: '✅ Correct', color: 'text-emerald-600 bg-emerald-50' };
      case 'minor': return { text: '⚠️ Mineur', color: 'text-amber-600 bg-amber-50' };
      default: return { text: '❌ Incorrect', color: 'text-rose-600 bg-rose-50' };
    }
  };

  const getLogicBadge = () => {
    switch (evaluation.logic) {
      case 'correct': return { text: '✅ Correct', color: 'text-emerald-600 bg-emerald-50' };
      case 'partial': return { text: '⚠️ Partiel', color: 'text-amber-600 bg-amber-50' };
      default: return { text: '❌ Incorrect', color: 'text-rose-600 bg-rose-50' };
    }
  };

  const getReadabilityBadge = () => {
    switch (evaluation.readability) {
      case 'very_readable': return { text: '⭐⭐ Très lisible', color: 'text-indigo-600 bg-indigo-50' };
      case 'readable': return { text: '⭐ Lisible', color: 'text-blue-600 bg-blue-50' };
      default: return { text: '⚠️ Peu lisible', color: 'text-slate-600 bg-slate-50' };
    }
  };

  const syntax = getSyntaxBadge();
  const logic = getLogicBadge();
  const readability = getReadabilityBadge();

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors text-xl font-bold">&times;</button>
          </div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-md">
            <Trophy className="w-10 h-10 text-yellow-300 shadow-sm" />
          </div>
          <h2 className="text-2xl font-black mb-1">Qualité Algorithmique</h2>
          <div className="text-4xl font-black text-yellow-300">{evaluation.score}/10</div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-bold text-slate-700">Syntaxe</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${syntax.color}`}>{syntax.text}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-bold text-slate-700">Logique</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${logic.color}`}>{logic.text}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-bold text-slate-700">Lisibilité</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${readability.color}`}>{readability.text}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-tighter text-slate-500">Feedback Pédagogique</h3>
            </div>
            <ul className="space-y-2">
              {evaluation.feedback.map((msg, idx) => (
                <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-indigo-400 mt-1">•</span>
                  {msg}
                </li>
              ))}
            </ul>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
};

export default QualityScorePanel;
