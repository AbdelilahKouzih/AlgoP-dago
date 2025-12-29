
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
    <div className="bg-slate-900 rounded-xl lg:rounded-2xl shadow-lg flex flex-col h-full overflow-hidden border border-slate-800 min-h-[250px] lg:min-h-0">
      <div className="px-4 py-3 lg:px-5 lg:py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />
          <span className="text-[10px] lg:text-xs font-black text-slate-300 tracking-widest uppercase">Console de sortie</span>
        </div>
        <div className="flex gap-1.5 lg:gap-2">
          <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-rose-500/50"></div>
          <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-amber-500/50"></div>
          <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-emerald-500/50"></div>
        </div>
      </div>
      <div className="flex-1 p-4 lg:p-6 overflow-auto font-mono text-sm lg:text-base leading-relaxed scroll-smooth bg-gradient-to-b from-slate-900 to-slate-950">
        {messages.length === 0 && (
          <div className="text-slate-600 italic animate-pulse">En attente d'exécution...</div>
        )}
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`mb-2 lg:mb-3 break-words animate-in slide-in-from-left-2 duration-300 ${
              msg.type === 'error' ? 'text-rose-400 bg-rose-400/10 p-2 rounded-lg border border-rose-400/20' : 
              msg.type === 'system' ? 'text-amber-400 font-medium italic opacity-90' : 
              msg.type === 'input' ? 'text-indigo-400 font-bold bg-indigo-400/5 p-1 rounded' : 
              'text-slate-100'
            }`}
          >
            {msg.type === 'input' && <span className="mr-3 text-slate-500">➜</span>}
            {msg.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Terminal;
