
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, RotateCcw, HelpCircle, Code2, AlertCircle, StepForward, Terminal as TerminalIcon } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import VariableWatcher from './components/VariableWatcher';
import { parseCode, parseVariables, validateSyntax } from './interpreter/parser';
import { evaluateExpression, castValue } from './interpreter/evaluator';
import { Instruction, ProgramState, ConsoleMessage, Variable, DataType } from './types';

const INITIAL_CODE = `Algorithme Demo_Exécution ;
Variables
   Age : entier
   Status : chaîne de caractères
Début
   Ecrire("Quel est votre âge ?")
   Lire(Age)
   
   Si Age >= 18 Alors
      Status <- "Majeur"
      Ecrire("Vous êtes ", Status)
   Sinon
      Status <- "Mineur"
      Ecrire("Vous êtes ", Status)
   Fin si
   
   Ecrire("Fin du programme.")
Fin`;

const App: React.FC = () => {
  const [code, setCode] = useState(INITIAL_CODE);
  const [state, setState] = useState<ProgramState>({
    variables: new Map(),
    console: [],
    currentLine: 0,
    instructionIndex: 0,
    isRunning: false,
    isPausedForInput: false,
    inputTarget: null,
    inputBuffer: []
  });

  const [promptValue, setPromptValue] = useState('');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const isAutoStepRef = useRef(false);

  const addConsole = (text: string, type: ConsoleMessage['type'] = 'output') => {
    setState(prev => ({
      ...prev,
      console: [...prev.console, { text, type, timestamp: new Date() }]
    }));
  };

  const resetProgram = () => {
    isAutoStepRef.current = false;
    setState({
      variables: new Map(),
      console: [],
      currentLine: 0,
      instructionIndex: 0,
      isRunning: false,
      isPausedForInput: false,
      inputTarget: null,
      inputBuffer: []
    });
  };

  const prepareExecution = () => {
    // Nettoyage avant analyse
    resetProgram();

    // 1. ANALYSE SYNTAXIQUE GLOBALE (FORCEE)
    const syntaxErrorMessage = validateSyntax(code);
    
    if (syntaxErrorMessage) {
      // Affichage pédagogique immédiat
      setState(prev => ({
        ...prev,
        console: [
          { text: "⚠️ ERREUR DE SYNTAXE DÉTECTÉE", type: 'error', timestamp: new Date() },
          { text: syntaxErrorMessage, type: 'error', timestamp: new Date() },
          { text: "Veuillez corriger le code avant de lancer l'exécution.", type: 'system', timestamp: new Date() }
        ]
      }));
      return false; // BLOQUE LE LANCEMENT
    }

    // 2. Si syntaxe OK, on parse les instructions et variables
    try {
      const parsedInstructions = parseCode(code);
      const parsedVars = parseVariables(code);
      const initialVars = new Map<string, Variable>();
      
      parsedVars.forEach((v, name) => {
        let defaultValue: any = undefined;
        if (v.type.includes('entier') || v.type.includes('réel')) defaultValue = 0;
        if (v.type.includes('chaîne')) defaultValue = "";
        if (v.type.includes('booléen')) defaultValue = false;

        initialVars.set(name, { name, type: v.type as DataType, value: defaultValue });
      });

      if (parsedInstructions.length === 0) {
        addConsole("Aucune instruction d'exécution trouvée entre Début et Fin.", "error");
        return false;
      }

      setInstructions(parsedInstructions);
      setState({
        variables: initialVars,
        console: [{ text: "Syntaxe validée. Lancement de l'algorithme...", type: 'system', timestamp: new Date() }],
        currentLine: parsedInstructions[0].lineNumber,
        instructionIndex: 0,
        isRunning: true,
        isPausedForInput: false,
        inputTarget: null,
        inputBuffer: []
      });
      return true;
    } catch (e: any) {
      addConsole(`Erreur système lors du parsing : ${e.message}`, 'error');
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
      let nextInputTarget = null;
      let nextInputBuffer = [...prev.inputBuffer];
      const newVars = new Map(prev.variables);
      const newConsole = [...prev.console];

      try {
        switch (instr.type) {
          case 'ECRIRE': {
            const match = instr.content.match(/Ecrire\s*\((.*)\)/i);
            if (match) {
              const content = match[1];
              const parts = content.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
              const output = parts.map(part => {
                const trimmed = part.trim();
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
                return String(evaluateExpression(trimmed, prev.variables));
              }).join('');
              newConsole.push({ text: output, type: 'output', timestamp: new Date() });
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
            const target = prev.variables.get(varName);
            if (!target) throw new Error(`Variable "${varName}" n'a pas été déclarée.`);
            const expr = parts.slice(1).join(sep).trim();
            const val = evaluateExpression(expr, prev.variables);
            newVars.set(varName, { ...target, value: castValue(String(val), target.type) });
            break;
          }

          case 'SI': {
            const match = instr.content.match(/Si\s+(.*)\s+Alors/i);
            if (match) {
              const conditionResult = !!evaluateExpression(match[1], prev.variables);
              if (!conditionResult) {
                let depth = 1;
                let found = false;
                for (let j = prev.instructionIndex + 1; j < instructions.length; j++) {
                  if (instructions[j].type === 'SI') depth++;
                  if (instructions[j].type === 'FIN_SI') depth--;
                  
                  if (depth === 1 && instructions[j].type === 'SINON') {
                    nextIndex = j + 1;
                    found = true; break;
                  }
                  if (depth === 0) {
                    nextIndex = j + 1;
                    found = true; break;
                  }
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
              if (depth === 0) {
                nextIndex = j + 1;
                break;
              }
            }
            break;
          }
        }
      } catch (e: any) {
        newConsole.push({ text: `ERREUR D'EXÉCUTION LIGNE ${instr.lineNumber}: ${e.message}`, type: 'error', timestamp: new Date() });
        return { ...prev, console: newConsole, isRunning: false };
      }

      if (nextIndex >= instructions.length && !nextIsPaused) {
          newConsole.push({ text: "Algorithme terminé avec succès.", type: 'system', timestamp: new Date() });
      }

      return {
        ...prev,
        variables: newVars,
        console: newConsole,
        instructionIndex: nextIndex,
        currentLine: nextIndex < instructions.length ? instructions[nextIndex].lineNumber : 0,
        isRunning: nextIndex < instructions.length || nextIsPaused,
        isPausedForInput: nextIsPaused,
        inputTarget: nextInputTarget,
        inputBuffer: nextInputBuffer
      };
    });
  }, [instructions]);

  useEffect(() => {
    let timer: number;
    if (state.isRunning && !state.isPausedForInput && isAutoStepRef.current) {
      timer = window.setTimeout(executeNextStep, 400);
    }
    return () => clearTimeout(timer);
  }, [state.isRunning, state.isPausedForInput, state.instructionIndex, executeNextStep]);

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
        const nextTarget = prev.inputBuffer[0];
        const nextBuffer = prev.inputBuffer.slice(1);
        
        return {
          ...prev,
          variables: newVars,
          console: [...prev.console, { text: promptValue, type: 'input', timestamp: new Date() }],
          inputTarget: nextTarget || null,
          inputBuffer: nextBuffer,
          isPausedForInput: !!nextTarget,
          instructionIndex: nextTarget ? prev.instructionIndex : prev.instructionIndex + 1,
          currentLine: (nextTarget ? prev.currentLine : (prev.instructionIndex + 1 < instructions.length ? instructions[prev.instructionIndex + 1].lineNumber : 0))
        };
      });
      setPromptValue('');
    } catch (e: any) {
      addConsole(`Valeur incompatible pour '${state.inputTarget}' : ${e.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-40">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-100">
            <Code2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">AlgoPédago - Analyseur</h1>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Contrôle de Syntaxe Actif</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tronc Commun Maroc</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { if (prepareExecution()) isAutoStepRef.current = true; }}
            disabled={state.isRunning && isAutoStepRef.current}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Exécuter l'Algo
          </button>
          <button 
            onClick={() => { if (!state.isRunning) prepareExecution(); else { isAutoStepRef.current = false; executeNextStep(); } }}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl font-bold transition-all shadow-sm active:scale-95"
          >
            <StepForward className="w-4 h-4" />
            Pas à Pas
          </button>
          <button onClick={resetProgram} className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold transition-all hover:bg-slate-200 active:scale-95 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Réinitialiser
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 gap-4">
        <section className="flex-[3] flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" />
                Éditeur (Vérification Globale)
            </div>
            {state.isRunning && <div className="text-[10px] font-bold text-indigo-500 animate-pulse">EXÉCUTION EN COURS...</div>}
          </div>
          <CodeEditor value={code} onChange={setCode} currentLine={state.currentLine} />
        </section>

        <section className="flex-[2] flex flex-col gap-4 min-h-0">
          <div className="flex-[3] flex flex-col min-h-0 relative">
            <Terminal messages={state.console} />
            {state.isPausedForInput && (
              <div className="absolute inset-x-4 bottom-4 p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 z-30">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h3 className="text-white text-xs font-bold uppercase tracking-tighter">Entrée clavier attendue : <span className="text-indigo-400 font-mono">{state.inputTarget}</span></h3>
                </div>
                <form onSubmit={handleInputSubmit} className="flex gap-2">
                  <input autoFocus type="text" value={promptValue} onChange={(e) => setPromptValue(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 text-emerald-400 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 font-mono" placeholder="Entrez la valeur..." />
                  <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">Valider</button>
                </form>
              </div>
            )}
          </div>
          <div className="flex-[2] min-h-0">
            <VariableWatcher variables={state.variables} />
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${state.isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
            <span className={state.isRunning ? 'text-emerald-600' : 'text-slate-400'}>
              {state.isRunning ? 'Moteur Actif' : 'Prêt pour Analyse'}
            </span>
          </div>
          {state.currentLine > 0 && <div className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">Instruction courante : Ligne {state.currentLine}</div>}
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          AlgoPédago v1.6 • Tronc Commun Maroc
        </div>
      </footer>
    </div>
  );
};

export default App;
