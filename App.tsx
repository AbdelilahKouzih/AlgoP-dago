
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, RotateCcw, Code2, AlertCircle, StepForward, Terminal as TerminalIcon, Box, BookOpen, ChevronDown, Trash2 } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import VariableWatcher from './components/VariableWatcher';
import { parseCode, parseAllDeclarations, validateSyntax } from './interpreter/parser';
import { evaluateExpression, castValue } from './interpreter/evaluator';
import { Instruction, ProgramState, ConsoleMessage, Variable, DataType } from './types';

const EXAMPLES = {
  demo: `Algorithme Demo_Scolaire
Constantes
   TVA = 20 ;
   MESSAGE = "Calcul en cours..." ;

Variables
   PrixHT : réel ;
   EstValide : booléen ;

Début
   Ecrire(MESSAGE) ;
   Ecrire("Entrez le prix HT :") ;
   Lire(PrixHT) ;
   
   Si PrixHT > 0 Alors
      EstValide <- vrai ;
      Ecrire("Prix valide.") ;
   Sinon
      EstValide <- faux ;
      Ecrire("Prix invalide.") ;
   Fin si
   
   Ecrire("Fin du programme.") ;
Fin`,
  surface: `Algorithme Calcul_Surface
Variables
   Largeur, Longueur, Surface : réel ;

Début
   Ecrire("Entrez la largeur :") ;
   Lire(Largeur) ;
   Ecrire("Entrez la longueur :") ;
   Lire(Longueur) ;
   
   Surface <- Largeur * Longueur ;
   
   Ecrire("La surface est : ", Surface) ;
Fin`,
  parite: `Algorithme Test_Parite
Variables
   N : entier ;

Début
   Ecrire("Entrez un nombre entier :") ;
   Lire(N) ;
   
   Si N MOD 2 = 0 Alors
      Ecrire("Le nombre est PAIR") ;
   Sinon
      Ecrire("Le nombre est IMPAIR") ;
   Fin si
Fin`
};

type ViewTab = 'editor' | 'console' | 'variables';

const App: React.FC = () => {
  const [code, setCode] = useState(EXAMPLES.demo);
  const [activeTab, setActiveTab] = useState<ViewTab>('editor');
  const [showExamples, setShowExamples] = useState(false);
  const [state, setState] = useState<ProgramState>({
    variables: new Map(),
    console: [],
    currentLine: 0,
    instructionIndex: 0,
    isRunning: false,
    isPausedForInput: false,
    inputTarget: null,
    inputBuffer: [],
  });

  const [promptValue, setPromptValue] = useState('');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const isAutoStepRef = useRef(false);

  const resetProgram = useCallback(() => {
    isAutoStepRef.current = false;
    setState({
      variables: new Map(),
      console: [],
      currentLine: 0,
      instructionIndex: 0,
      isRunning: false,
      isPausedForInput: false,
      inputTarget: null,
      inputBuffer: [],
    });
  }, []);

  const clearEditor = useCallback(() => {
    if (window.confirm("Voulez-vous vraiment effacer tout le code ?")) {
      setCode(""); 
      resetProgram(); 
    }
  }, [resetProgram]);

  const addConsole = (text: string, type: ConsoleMessage['type'] = 'output') => {
    setState(prev => ({
      ...prev,
      console: [...prev.console, { text, type, timestamp: new Date() }]
    }));
  };

  const prepareExecution = () => {
    resetProgram();
    const syntaxErrorMessage = validateSyntax(code);
    if (syntaxErrorMessage) {
      setState(prev => ({
        ...prev,
        console: [
          { text: "🚨 ANALYSE SYNTAXIQUE : ÉCHEC", type: 'error' as const, timestamp: new Date() },
          { text: syntaxErrorMessage, type: 'error' as const, timestamp: new Date() },
          { text: "Rappel : Chaque instruction doit finir par ';' sauf les mots-clés de structure.", type: 'system' as const, timestamp: new Date() }
        ]
      }));
      setActiveTab('console');
      return false;
    }

    try {
      const parsedInstructions = parseCode(code);
      const allDeclarations = parseAllDeclarations(code);
      
      allDeclarations.forEach((v) => {
        if (!v.isConstant) {
            let defaultValue: any = undefined;
            const t = v.type.toLowerCase();
            if (t.includes('entier') || t.includes('réel')) defaultValue = 0;
            else if (t.includes('chaîne') || t.includes('chaine') || t.includes('caractère')) defaultValue = "";
            else if (t.includes('booléen')) defaultValue = false;
            v.value = defaultValue;
        } else if (typeof v.value === 'string') {
            const s = v.value.trim();
            if (s.startsWith('"') && s.endsWith('"')) v.value = s.slice(1, -1);
        }
      });

      if (parsedInstructions.length === 0) {
        addConsole("Aucune instruction valide trouvée dans le corps de l'algorithme.", "error");
        return false;
      }

      setInstructions(parsedInstructions);
      setState(prev => ({
        ...prev,
        variables: allDeclarations,
        console: [{ text: "Analyse terminée avec succès. Lancement...", type: 'system' as const, timestamp: new Date() }],
        currentLine: parsedInstructions[0].lineNumber,
        instructionIndex: 0,
        isRunning: true,
      }));
      return true;
    } catch (e: any) {
      addConsole(`Erreur interne : ${e.message}`, 'error');
      return false;
    }
  };

  const executeNextStep = useCallback(() => {
    setState(prev => {
      if (!prev.isRunning || prev.isPausedForInput || prev.instructionIndex >= instructions.length) {
        if (prev.instructionIndex >= instructions.length && prev.isRunning) {
            return { ...prev, isRunning: false, currentLine: 0 };
        }
        return prev;
      }

      const instr = instructions[prev.instructionIndex];
      let nextIndex = prev.instructionIndex + 1;
      let nextIsPaused = false;
      let nextInputTarget: string | null = null;
      let nextInputBuffer = [...prev.inputBuffer];
      const newVars = new Map(prev.variables);
      const newConsole: ConsoleMessage[] = [...prev.console];

      try {
        switch (instr.type) {
          case 'ECRIRE': {
            const match = instr.content.match(/Ecrire\s*\((.*)\)/i);
            if (match) {
              const content = match[1];
              const parts = content.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
              const output = parts.map(part => {
                const partTrimmed = part.trim();
                if (partTrimmed.startsWith('"') && partTrimmed.endsWith('"')) return partTrimmed.slice(1, -1);
                return String(evaluateExpression(partTrimmed, prev.variables));
              }).join('');
              newConsole.push({ text: output, type: 'output' as const, timestamp: new Date() });
            }
            break;
          }
          case 'LIRE': {
            const match = instr.content.match(/Lire\s*\((.*)\)/i);
            if (match) {
              const varsToRead = match[1].split(',').map(v => v.trim());
              nextIsPaused = true;
              nextInputTarget = varsToRead[0];
              nextInputBuffer = varsToRead.slice(1);
              nextIndex = prev.instructionIndex; 
            }
            break;
          }
          case 'AFFECTATION': {
            const sep = instr.content.includes('←') ? '←' : '<-';
            const parts = instr.content.split(sep);
            const varName = parts[0].trim();
            const symbol = prev.variables.get(varName);
            if (!symbol) throw new Error(`Symbol '${varName}' non trouvé.`);
            const expr = parts.slice(1).join(sep).trim();
            const val = evaluateExpression(expr, prev.variables);
            newVars.set(varName, { ...symbol, value: castValue(String(val), symbol.type) });
            break;
          }
          case 'SI': {
            const match = instr.content.match(/Si\s+(.*)\s+Alors/i);
            if (match) {
              const conditionResult = !!evaluateExpression(match[1], prev.variables);
              if (!conditionResult) {
                let depth = 1;
                for (let j = prev.instructionIndex + 1; j < instructions.length; j++) {
                  if (instructions[j].type === 'SI') depth++;
                  if (instructions[j].type === 'FIN_SI') depth--;
                  if (depth === 1 && instructions[j].type === 'SINON') { nextIndex = j + 1; break; }
                  if (depth === 0) { nextIndex = j + 1; break; }
                }
              }
            }
            break;
          }
          case 'SINON': {
            let depth = 1;
            for (let j = prev.instructionIndex + 1; j < instructions.length; j++) {
              if (instructions[j].type === 'SI') depth++;
              if (instructions[j].type === 'FIN_SI') depth--;
              if (depth === 0) { nextIndex = j + 1; break; }
            }
            break;
          }
        }
      } catch (e: any) {
        newConsole.push({ text: `ERREUR : Ligne ${instr.lineNumber} - ${e.message}`, type: 'error' as const, timestamp: new Date() });
        return { ...prev, console: newConsole, isRunning: false };
      }

      let isFinished = false;
      if (nextIndex >= instructions.length && !nextIsPaused) {
          newConsole.push({ text: "Algorithme terminé avec succès.", type: 'system' as const, timestamp: new Date() });
          isFinished = true;
      }

      return {
        ...prev,
        variables: newVars,
        console: newConsole,
        instructionIndex: nextIndex,
        currentLine: nextIndex < instructions.length ? instructions[nextIndex].lineNumber : 0,
        isRunning: (nextIndex < instructions.length || nextIsPaused) && !isFinished,
        isPausedForInput: nextIsPaused,
        inputTarget: nextInputTarget,
        inputBuffer: nextInputBuffer
      };
    });
  }, [instructions]);

  useEffect(() => {
    let timer: number;
    if (state.isRunning && !state.isPausedForInput && isAutoStepRef.current) {
      timer = window.setTimeout(executeNextStep, 450);
    }
    return () => clearTimeout(timer);
  }, [state.isRunning, state.isPausedForInput, state.instructionIndex, executeNextStep]);

  const loadExample = (key: keyof typeof EXAMPLES) => {
    setCode(EXAMPLES[key]);
    setShowExamples(false);
    resetProgram();
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.inputTarget) return;
    const targetVar = state.variables.get(state.inputTarget);
    if (!targetVar) return;

    try {
      const casted = castValue(promptValue, targetVar.type);
      setState(prev => {
        const newVars = new Map(prev.variables);
        newVars.set(state.inputTarget!, { ...targetVar, value: casted });
        const nextTarget = prev.inputBuffer[0] || null;
        const nextBuffer = prev.inputBuffer.slice(1);
        const isActuallyFinished = !nextTarget && (prev.instructionIndex + 1 >= instructions.length);
        const newConsole: ConsoleMessage[] = [...prev.console, { text: promptValue, type: 'input' as const, timestamp: new Date() }];

        const nextState: ProgramState = {
          ...prev,
          variables: newVars,
          console: newConsole,
          inputTarget: nextTarget,
          inputBuffer: nextBuffer,
          isPausedForInput: !!nextTarget,
          instructionIndex: nextTarget ? prev.instructionIndex : prev.instructionIndex + 1,
          currentLine: (nextTarget ? prev.currentLine : (prev.instructionIndex + 1 < instructions.length ? instructions[prev.instructionIndex + 1].lineNumber : 0)),
          isRunning: !isActuallyFinished || !!nextTarget,
        };

        if (isActuallyFinished && !nextTarget) {
          const finalConsole: ConsoleMessage[] = [...newConsole, { text: "Algorithme terminé avec succès.", type: 'system' as const, timestamp: new Date() }];
          return { ...nextState, console: finalConsole, isRunning: false, currentLine: 0 };
        }
        return nextState;
      });
      setPromptValue('');
    } catch (e: any) {
      addConsole(`Erreur de type : ${e.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-h-screen bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b-2 border-slate-200 px-4 py-4 lg:px-8 lg:py-6 flex flex-col md:flex-row items-center justify-between shrink-0 shadow-sm z-40 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-100 shrink-0">
            <Code2 className="text-white w-6 h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none mb-1 lg:mb-2">AbdoBox</h1>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] lg:text-xs font-black rounded-lg uppercase border border-emerald-200">Pédagogie TC</span>
              <div className="relative">
                <button 
                  onClick={() => setShowExamples(!showExamples)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 text-[10px] lg:text-xs font-black rounded-lg uppercase border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <BookOpen className="w-3 h-3 lg:w-4 lg:h-4" />
                  <span>Exemples</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
                </button>
                {showExamples && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button onClick={() => loadExample('demo')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-b border-slate-100">Démonstration</button>
                    <button onClick={() => loadExample('surface')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border-b border-slate-100">Calcul de Surface</button>
                    <button onClick={() => loadExample('parite')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Test de Parité</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => { if (prepareExecution()) isAutoStepRef.current = true; }}
            disabled={state.isRunning && isAutoStepRef.current}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 lg:px-10 py-3 lg:py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-2xl font-black transition-all shadow-lg active:scale-95 text-xs lg:text-base whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            Exécuter
          </button>
          <button 
            onClick={() => { if (!state.isRunning) prepareExecution(); else { isAutoStepRef.current = false; executeNextStep(); } }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-8 py-3 lg:py-4 bg-white border-2 border-slate-100 text-slate-600 hover:text-indigo-600 rounded-2xl font-black transition-all shadow-md active:scale-95 text-xs lg:text-base whitespace-nowrap"
          >
            <StepForward className="w-4 h-4" />
            Pas à Pas
          </button>
          <button 
            onClick={resetProgram} 
            className="md:flex-none p-3 lg:px-8 lg:py-4 bg-slate-100 text-slate-500 rounded-2xl font-black transition-all hover:bg-slate-200 active:scale-95 flex items-center justify-center gap-2 text-xs lg:text-base"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row p-3 lg:p-6 gap-4 lg:gap-6 relative bg-slate-100/30">
        <div className="lg:hidden flex bg-white border-2 border-slate-200 rounded-2xl p-1.5 shrink-0 shadow-sm mb-2">
          <button onClick={() => setActiveTab('editor')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'editor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
            <Code2 className="w-4 h-4" /> ÉDITEUR
          </button>
          <button onClick={() => setActiveTab('console')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'console' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
            <TerminalIcon className="w-4 h-4" /> CONSOLE
          </button>
          <button onClick={() => setActiveTab('variables')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'variables' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
            <Box className="w-4 h-4" /> MÉMOIRE
          </button>
        </div>

        <section className={`flex-[3.5] flex flex-col gap-3 min-h-0 ${activeTab !== 'editor' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="hidden lg:flex items-center justify-between px-2 shrink-0">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <TerminalIcon className="w-4 h-4" />
                Script Algorithmique
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={clearEditor}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full border border-rose-100 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                VIDER L'ÉDITEUR
              </button>
              <div className="text-[10px] font-black text-indigo-500 bg-white px-3 py-1 rounded-full border-2 border-indigo-100">
                Prêt pour l'analyse
              </div>
            </div>
          </div>
          <CodeEditor value={code} onChange={setCode} currentLine={state.currentLine} />
        </section>

        <section className={`flex-[2.5] flex flex-col items-stretch gap-4 lg:gap-6 min-h-0 ${activeTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
          <div className={`flex-[7] flex flex-col items-stretch min-h-0 relative ${activeTab === 'variables' ? 'hidden lg:flex' : 'flex'}`}>
            <Terminal messages={state.console} />
            {state.isPausedForInput && (
              <div className="absolute inset-x-2 bottom-2 lg:inset-x-6 lg:bottom-6 p-5 lg:p-8 bg-slate-900/95 backdrop-blur-lg border-2 border-indigo-500/50 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 z-30">
                <div className="flex items-center gap-3 mb-4 lg:mb-6">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                    <h3 className="text-white text-xs lg:text-sm font-black uppercase tracking-widest">
                      Entrée requise : <span className="text-indigo-400 font-mono text-base lg:text-lg underline underline-offset-4">{state.inputTarget}</span>
                    </h3>
                </div>
                <form onSubmit={handleInputSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input autoFocus type="text" value={promptValue} onChange={(e) => setPromptValue(e.target.value)} className="flex-1 bg-slate-800 border-2 border-slate-700 text-emerald-400 rounded-2xl px-5 py-3 lg:py-4 text-sm lg:text-base outline-none focus:border-indigo-500 font-mono shadow-inner transition-all" placeholder="Tapez la valeur..." />
                  <button type="submit" className="bg-indigo-600 text-white px-8 py-3 lg:py-4 rounded-2xl text-sm lg:text-base font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 active:scale-95">CONFIRMER</button>
                </form>
              </div>
            )}
          </div>
          <div className={`flex-[3] flex flex-col items-stretch min-h-0 ${activeTab === 'console' ? 'hidden lg:flex' : 'flex'}`}>
            <VariableWatcher variables={state.variables} />
          </div>
        </section>
      </main>

      <footer className="bg-white border-t-2 border-slate-200 px-6 py-4 lg:px-10 lg:py-6 flex items-center justify-between text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 shrink-0">
        <div className="flex items-center gap-6 lg:gap-12 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
            <div className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full transition-all duration-500 ${state.isRunning ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-slate-200'}`}></div>
            <span className={state.isRunning ? 'text-emerald-600 font-black' : 'text-slate-400 font-black'}>{state.isRunning ? 'EXÉCUTION ACTIVE' : 'SYSTÈME PRÊT'}</span>
          </div>
          {state.currentLine > 0 && <div className="text-indigo-600 bg-indigo-50 px-3 py-1 lg:px-4 lg:py-2 rounded-xl border-2 border-indigo-100 shadow-sm font-black whitespace-nowrap">LIGNE : {state.currentLine}</div>}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4 opacity-70">
          <AlertCircle className="w-4 h-4 text-indigo-300" />
          <span className="hidden sm:inline">AbdoBox Tronc Commun V2.5</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
