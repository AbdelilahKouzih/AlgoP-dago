
import React from 'react';
import { Variable } from '../types';
import { Box, Lock, Unlock, Database } from 'lucide-react';

interface VariableWatcherProps {
  variables: Map<string, Variable>;
}

const VariableWatcher: React.FC<VariableWatcherProps> = ({ variables }) => {
  const allSymbols: Variable[] = Array.from(variables.values());

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden flex flex-col h-full w-full">
      {/* Header compact */}
      <div className="px-4 py-2 bg-slate-50 border-b-2 border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <h2 className="text-[10px] lg:text-xs font-black text-slate-800 uppercase tracking-widest">Registres Mémoire</h2>
        </div>
        <div className="flex gap-3 text-[9px] font-bold text-slate-400">
           <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> {allSymbols.filter(s => s.isConstant).length}</span>
           <span className="flex items-center gap-1"><Unlock className="w-2.5 h-2.5" /> {allSymbols.filter(s => !s.isConstant).length}</span>
        </div>
      </div>
      
      {/* Table unique et compacte */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {allSymbols.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-40">
            <Box className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-[10px] italic">Aucune donnée en mémoire</p>
          </div>
        ) : (
          <table className="w-full text-[11px] lg:text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-white border-b border-slate-100 shadow-sm z-10">
              <tr>
                <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-tighter w-8"></th>
                <th className="px-2 py-1.5 font-black text-slate-400 uppercase tracking-tighter">Identifiant</th>
                <th className="px-2 py-1.5 font-black text-slate-400 uppercase tracking-tighter">Type</th>
                <th className="px-3 py-1.5 font-black text-slate-400 uppercase tracking-tighter text-right">Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allSymbols.map((v) => (
                <tr key={v.name} className="hover:bg-indigo-50/50 transition-colors group">
                  <td className="px-3 py-1.5 text-center">
                    {/* Wrapped Lucide icons in a span because the title prop is not supported directly on Lucide components */}
                    {v.isConstant ? (
                      <span title="Constante"><Lock className="w-3 h-3 text-amber-500 inline" /></span>
                    ) : (
                      <span title="Variable"><Unlock className="w-3 h-3 text-emerald-500 inline" /></span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 font-mono font-bold text-indigo-700 truncate">
                    {v.name}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <span className="text-[9px] font-black text-slate-400 uppercase">
                      {v.type.split(' ')[0]}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-black text-slate-700">
                    <div className="inline-block px-2 py-0.5 rounded border border-slate-100 bg-white shadow-sm min-w-[30px]">
                      {v.value === undefined ? (
                        <span className="text-slate-200">?</span>
                      ) : v.value === true ? (
                        <span className="text-emerald-600">vrai</span>
                      ) : v.value === false ? (
                        <span className="text-rose-600">faux</span>
                      ) : typeof v.value === 'string' ? (
                        <span className="text-amber-600">"{v.value}"</span>
                      ) : (
                        v.value
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VariableWatcher;
