
import React, { useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  currentLine?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, currentLine }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');

  // Synchronisation du défilement
  const handleScroll = () => {
    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
      lineNumbersRef.current.scrollTop = top;
    }
  };

  /**
   * Moteur de coloration "Single Pass" par tokens
   */
  const highlightCode = (code: string) => {
    // BUG FIX ELECTRON: Si le code est vide, on renvoie un espace insécable 
    // pour éviter que le composant <pre> ne s'effondre et ne bloque le hit-testing.
    if (!code || code.trim() === "") return "\u00A0";

    // 1. Échappement HTML initial
    let escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Définition des patterns
    const tokens: { pattern: RegExp; css: string }[] = [
      { pattern: /(\/\/.*$)/gm, css: 'text-slate-400 italic opacity-70' }, // Commentaires
      { pattern: /("[^"]*")/g, css: 'text-amber-600 font-bold' }, // Chaînes
      { 
        pattern: /\b(Algorithme|Constantes|Variables|Début|Debut|Fin|Si|Alors|Sinon|Fin si|Finsi|Pour|Finpour|Tant que|TantQue|Fintantque|Fintant que)\b/gi, 
        css: 'text-indigo-600 font-black' 
      },
      { pattern: /\b(Lire|Ecrire)\b/gi, css: 'text-emerald-600 font-bold' }, // E/S
      { pattern: /\b(entier|réel|reel|booléen|booleen|caractère|caractere|chaîne de caractères|chaine de caractères)\b/gi, css: 'text-sky-500 font-bold' },
      { pattern: /\b(vrai|faux)\b/gi, css: 'text-rose-500 font-black' }, // Booléens
      { pattern: /\b(DIV|MOD|ET|OU|NON)\b/g, css: 'text-pink-500 font-bold' }, // Opérateurs texte
      { pattern: /(<-|←|<=|>=|<>|=|\+|-|\*|\/)/g, css: 'text-indigo-400 font-bold' }, // Opérateurs symboles
      { pattern: /\b(\d+)\b/g, css: 'text-orange-500' } // Nombres
    ];

    type Match = { index: number; length: number; css: string; text: string };
    const matches: Match[] = [];

    tokens.forEach(({ pattern, css }) => {
      let m;
      pattern.lastIndex = 0;
      while ((m = pattern.exec(escaped)) !== null) {
        matches.push({
          index: m.index,
          length: m[0].length,
          css: css,
          text: m[0]
        });
      }
    });

    matches.sort((a, b) => a.index - b.index || b.length - a.length);

    let result = "";
    let lastIndex = 0;
    for (const match of matches) {
      if (match.index < lastIndex) continue; 
      
      result += escaped.substring(lastIndex, match.index);
      result += `<span class="${match.css}">${match.text}</span>`;
      lastIndex = match.index + match.length;
    }
    result += escaped.substring(lastIndex);

    return result;
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  // Styles identiques forcés pour une superposition parfaite
  const sharedStyles: React.CSSProperties = {
    fontFamily: '"Fira Code", monospace',
    fontSize: '14px',
    lineHeight: '1.75rem',
    padding: '1.25rem',
    tabSize: 4,
    whiteSpace: 'pre',
    wordWrap: 'normal',
    margin: 0,
    border: 0,
    boxSizing: 'border-box'
  };

  // Force le focus sur le textarea lors d'un clic sur le conteneur
  const focusEditor = () => {
    textareaRef.current?.focus();
  };

  return (
    <div 
      className="relative flex flex-1 h-full bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-0 group cursor-text"
      onClick={focusEditor}
    >
      
      {/* Sidebar Numéros de Ligne */}
      <div 
        ref={lineNumbersRef}
        className="bg-slate-50 border-r border-slate-200 text-right select-none overflow-hidden shrink-0 pointer-events-none"
        style={{ width: '3.5rem', paddingTop: '1.25rem' }}
      >
        {lines.map((_, i) => (
          <div 
            key={i} 
            className={`px-3 text-xs font-mono h-7 flex items-center justify-end transition-all duration-300 ${
              currentLine === i + 1 
                ? 'text-indigo-600 font-black bg-indigo-100/60 border-r-2 border-indigo-500 scale-105' 
                : 'text-slate-300'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      
      {/* Zone d'édition et rendu */}
      <div className="relative flex-1 h-full overflow-hidden bg-white selection-allowed">
        {/* Rendu Coloré (Arrière-plan) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          style={{
            ...sharedStyles,
            zIndex: 1
          }}
          className="absolute inset-0 m-0 pointer-events-none overflow-hidden select-none text-slate-700 bg-transparent"
          dangerouslySetInnerHTML={{ __html: highlightCode(value) + "\n" }}
        />
        
        {/* Saisie Utilisateur (Premier plan - Transparent) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          style={{
            ...sharedStyles,
            color: 'transparent',
            caretColor: '#1e293b',
            background: 'transparent',
            zIndex: 10,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            userSelect: 'text' // Sécurité additionnelle pour Electron
          }}
          className="resize-none outline-none focus:ring-0 overflow-auto scroll-smooth"
          placeholder="Saisissez votre algorithme ici..."
        />
      </div>

      {/* Étiquette d'état */}
      <div className="absolute top-3 right-5 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity text-[9px] font-black text-slate-400 uppercase tracking-widest z-20 flex items-center gap-2 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm shadow-sm border border-slate-100">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
        Editeur Actif
      </div>
    </div>
  );
};

export default CodeEditor;
