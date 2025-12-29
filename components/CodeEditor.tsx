
import React from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  currentLine?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, currentLine }) => {
  const lines = value.split('\n');

  return (
    <div className="relative flex flex-1 h-full bg-white border border-slate-200 rounded-xl lg:rounded-2xl shadow-sm overflow-hidden min-h-[350px] lg:min-h-0">
      {/* Line Numbers */}
      <div className="bg-slate-50 border-r border-slate-100 px-3 lg:px-4 py-4 lg:py-5 text-right select-none flex flex-col shrink-0 min-w-[3rem] lg:min-w-[4rem]">
        {lines.map((_, i) => (
          <div 
            key={i} 
            className={`font-mono text-xs lg:text-base leading-7 lg:leading-8 ${currentLine === i + 1 ? 'text-indigo-600 font-bold bg-indigo-50 -mx-3 lg:-mx-4 px-3 lg:px-4' : 'text-slate-300'}`}
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
        className="flex-1 p-4 lg:p-5 font-mono text-sm lg:text-[16px] leading-7 lg:leading-8 text-slate-800 bg-transparent resize-none outline-none focus:ring-0 whitespace-pre overflow-auto scroll-smooth"
        placeholder="Ecrivez votre algorithme ici..."
      />
    </div>
  );
};

export default CodeEditor;
