
import React, { useEffect, useRef } from 'react';
import { ConsoleMessage } from '../types';
import { Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  messages: ConsoleMessage[];
}

const Terminal: React.FC<TerminalProps> = ({ messages }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="bg-slate-900 rounded-xl shadow-lg flex flex-col h-full overflow-hidden border border-slate-800">
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Console d'exécution</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto font-mono text-sm leading-relaxed">
        {messages.length === 0 && (
          <div className="text-slate-600 italic">En attente d'exécution...</div>
        )}
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`mb-1 ${
              msg.type === 'error' ? 'text-rose-400' : 
              msg.type === 'system' ? 'text-amber-400 italic' : 
              msg.type === 'input' ? 'text-indigo-400' : 
              'text-slate-100'
            }`}
          >
            {msg.type === 'input' && <span className="mr-2 text-slate-500">?</span>}
            {msg.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Terminal;
