
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
    <div className="fixed inset-0 lg:absolute lg:inset-0 z-[100] flex items-center justify-center p-3 lg:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-sm lg:max-w-md overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95%] lg:max-h-none">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 lg:p-8 text-center text-white relative shrink-0">
          <div className="absolute top-4 right-4">
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors text-xl font-bold p-2">&times;</button>
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 lg:w-20 lg:h-20 bg-white/20 rounded-full mb-3 lg:mb-4 backdrop-blur-md border border-white/30 shadow-inner">
            <Trophy className="w-7 h-7 lg:w-10 lg:h-10 text-yellow-300" />
          </div>
          <h2 className="text-xl lg:text-2xl font-black mb-1">Qualité Algorithmique</h2>
          <div className="text-3xl lg:text-4xl font-black text-yellow-300 tracking-tighter">{evaluation.score}/10</div>
        </div>

        <div className="p-5 lg:p-8 space-y-4 lg:space-y-6 overflow-y-auto">
          <div className="grid gap-2 lg:gap-4">
            <div className="flex items-center justify-between p-2 lg:p-3 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm bg-white">
              <div className="flex items-center gap-2 lg:gap-3">
                <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
                <span className="text-xs lg:text-sm font-bold text-slate-700">Syntaxe</span>
              </div>
              <span className={`text-[9px] lg:text-xs font-bold px-2 py-0.5 lg:px-3 lg:py-1 rounded-full ${syntax.color}`}>{syntax.text}</span>
            </div>

            <div className="flex items-center justify-between p-2 lg:p-3 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm bg-white">
              <div className="flex items-center gap-2 lg:gap-3">
                <BrainCircuit className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
                <span className="text-xs lg:text-sm font-bold text-slate-700">Logique</span>
              </div>
              <span className={`text-[9px] lg:text-xs font-bold px-2 py-0.5 lg:px-3 lg:py-1 rounded-full ${logic.color}`}>{logic.text}</span>
            </div>

            <div className="flex items-center justify-between p-2 lg:p-3 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm bg-white">
              <div className="flex items-center gap-2 lg:gap-3">
                <Star className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
                <span className="text-xs lg:text-sm font-bold text-slate-700">Lisibilité</span>
              </div>
              <span className={`text-[9px] lg:text-xs font-bold px-2 py-0.5 lg:px-3 lg:py-1 rounded-full ${readability.color}`}>{readability.text}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2 lg:mb-3">
              <MessageCircle className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600" />
              <h3 className="text-[10px] lg:text-xs font-black uppercase tracking-tighter text-slate-500">Feedback Pédagogique</h3>
            </div>
            <ul className="space-y-1.5 lg:space-y-2">
              {evaluation.feedback.map((msg, idx) => (
                <li key={idx} className="text-xs lg:text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-indigo-400 mt-1 shrink-0">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 lg:py-4 rounded-xl lg:rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95 text-sm lg:text-base mt-2"
          >
            Fermer et Continuer
          </button>
        </div>
      </div>
    </div>
  );
};

export default QualityScorePanel;
