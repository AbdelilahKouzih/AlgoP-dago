
import React from 'react';
import { Variable } from '../types';
import { Box, Lock, Unlock } from 'lucide-react';

interface VariableWatcherProps {
  variables: Map<string, Variable>;
}

const VariableWatcher: React.FC<VariableWatcherProps> = ({ variables }) => {
  const allSymbols: Variable[] = Array.from(variables.values());
  const constants = allSymbols.filter(s => s.isConstant);
  const userVariables = allSymbols.filter(s => !s.isConstant);

  const renderTable = (list: Variable[], title: string, icon: React.ReactNode) => (
    <div className="mb-4 last:mb-0">
      <div className="px-4 py-2 bg-slate-100/50 border-y border-slate-200 flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
      </div>
      {list.length === 0 ? (
        <div className="p-4 text-center text-slate-400 italic text-xs">Aucun élément</div>
      ) : (
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {list.map((v) => (
              <tr key={v.name} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-4 py-2 font-mono font-medium text-indigo-700 w-1/3 truncate">{v.name}</td>
                <td className="px-4 py-2 text-slate-400 italic text-xs w-1/4">{v.isConstant ? 'valeur fixe' : v.type}</td>
                <td className="px-4 py-2 font-mono text-slate-900 truncate">
                  {v.value === undefined ? <span className="text-slate-300">?</span> : 
                   v.value === true ? 'vrai' : 
                   v.value === false ? 'faux' : 
                   String(v.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
        <Box className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-slate-700">Mémoire de la Machine</h2>
      </div>
      <div className="flex-1 overflow-auto">
        {renderTable(constants, "Constantes (Lecture seule)", <Lock className="w-3 h-3 text-amber-500" />)}
        {renderTable(userVariables, "Variables (Dynamiques)", <Unlock className="w-3 h-3 text-emerald-500" />)}
      </div>
    </div>
  );
};

export default VariableWatcher;
