
import React from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  currentLine?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, currentLine }) => {
  const lines = value.split('\n');

  return (
    <div className="relative flex flex-1 h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Line Numbers */}
      <div className="bg-slate-50 border-r border-slate-100 px-3 py-4 text-right select-none flex flex-col shrink-0 min-w-[3rem]">
        {lines.map((_, i) => (
          <div 
            key={i} 
            className={`font-mono text-sm leading-6 ${currentLine === i + 1 ? 'text-indigo-600 font-bold bg-indigo-50 -mx-3 px-3' : 'text-slate-300'}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      
      {/* Editor Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="flex-1 p-4 font-mono text-sm leading-6 text-slate-800 bg-transparent resize-none outline-none focus:ring-0 whitespace-pre overflow-auto"
        placeholder="Ecrivez votre algorithme ici..."
      />
    </div>
  );
};

export default CodeEditor;
