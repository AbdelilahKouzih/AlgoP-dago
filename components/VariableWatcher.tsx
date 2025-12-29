
import React from 'react';
import { Variable } from '../types';
import { Box, Table2 } from 'lucide-react';

interface VariableWatcherProps {
  variables: Map<string, Variable>;
}

const VariableWatcher: React.FC<VariableWatcherProps> = ({ variables }) => {
  // Explicitly type varList as Variable[] to fix property access errors on 'unknown' type
  const varList: Variable[] = Array.from(variables.values());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <Box className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-slate-700">Mémoire (Variables)</h2>
      </div>
      <div className="flex-1 overflow-auto">
        {varList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic text-sm">
            Aucune variable déclarée
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {varList.map((v) => (
                <tr key={v.name} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-4 py-2 font-mono font-medium text-indigo-700">{v.name}</td>
                  <td className="px-4 py-2 text-slate-500 italic">{v.type}</td>
                  <td className="px-4 py-2 font-mono text-slate-900">
                    {v.value === undefined ? <span className="text-slate-300">indéfinie</span> : 
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
    </div>
  );
};

export default VariableWatcher;
