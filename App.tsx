
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, RotateCcw, HelpCircle, Code2, AlertCircle, StepForward, Terminal as TerminalIcon } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import VariableWatcher from './components/VariableWatcher';
import QualityScorePanel from './components/QualityScorePanel';
import { parseCode, parseAllDeclarations, validateSyntax } from './interpreter/parser';
import { evaluateExpression, castValue } from './interpreter/evaluator';
import { Instruction, ProgramState, ConsoleMessage, Variable, DataType, QualityScore } from './types';

const INITIAL_CODE = `Algorithme Demo_Scolaire
Constantes
   TVA = 20 ;
   MESSAGE = "Calcul en cours..." ;

Variables
   PrixHT : réel ;
   EstValide : booléen ;
   Initiale : caractère ;

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
    inputBuffer: [],
    evaluation: null
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

  const calculateQualityScore = useCallback((finalState: ProgramState): QualityScore => {
    const feedback: string[] = [];
    let syntax: QualityScore['syntax'] = 'correct';
    let logic: QualityScore['logic'] = 'correct';
    let readability: QualityScore['readability'] = 'very_readable';
    let baseScore = 0;

    // 1. Syntax Score (0-3)
    const syntaxError = validateSyntax(code);
    if (!syntaxError) {
      baseScore += 3;
      syntax = 'correct';
      feedback.push("✅ Ta syntaxe est impeccable, bravo !");
    } else {
      syntax = 'incorrect';
      feedback.push("❌ Il reste des erreurs de syntaxe à corriger.");
    }

    // 2. Logic Score (0-4)
    const runtimeErrors = finalState.console.filter(m => m.type === 'error').length;
    if (runtimeErrors === 0) {
      baseScore += 4;
      logic = 'correct';
      feedback.push("✅ Ton algorithme s'est exécuté sans aucune erreur logique.");
    } else {
      logic = 'incorrect';
      baseScore += 1;
      feedback.push("⚠️ Attention aux erreurs pendant l'exécution.");
    }

    // 3. Readability Score (0-3)
    let readPoints = 0;
    const lines = code.split('\n');
    
    // Check indentation
    let hasIndentation = false;
    let inSiBlock = false;
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('si ')) inSiBlock = true;
      else if (trimmed.startsWith('fin si') || trimmed === 'finsi') inSiBlock = false;
      else if (inSiBlock && line.startsWith('   ')) hasIndentation = true;
    }
    if (hasIndentation) readPoints += 1.5;
    else feedback.push("💡 Astuce : Utilise des espaces (indentation) pour décaler les blocs SI.");

    // Check variable naming
    const varNames = Array.from(finalState.variables.keys());
    const avgLen = varNames.reduce((acc, name) => acc + name.length, 0) / (varNames.length || 1);
    if (avgLen > 3) readPoints += 1.5;
    else feedback.push("💡 Astuce : Choisis des noms de variables plus explicites (ex: 'PrixHT' au lieu de 'A').");

    if (readPoints >= 3) readability = 'very_readable';
    else if (readPoints >= 1.5) readability = 'readable';
    else readability = 'poor';

    baseScore += readPoints;

    return {
      syntax,
      logic,
      readability,
      score: Math.round(baseScore),
      feedback: feedback.length > 0 ? feedback : ["Beau travail global !"]
    };
  }, [code]);

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
      inputBuffer: [],
      evaluation: null
    });
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
      return false;
    }

    try {
      const parsedInstructions = parseCode(code);
      const allDeclarations = parseAllDeclarations(code);
      
      allDeclarations.forEach((v, name) => {
        if (!v.isConstant) {
            let defaultValue: any = undefined;
            const t = v.type.toLowerCase();
            if (t.includes('entier') || t.includes('réel')) defaultValue = 0;
            else if (t.includes('chaîne') || t.includes('chaine') || t.includes('caractère')) defaultValue = "";
            else if (t.includes('booléen')) defaultValue = false;
            v.value = defaultValue;
        } else {
            if (typeof v.value === 'string') {
                const s = v.value.trim();
                if (s.startsWith('"') && s.endsWith('"')) v.value = s.slice(1, -1);
            }
        }
      });

      if (parsedInstructions.length === 0) {
        addConsole("Aucune instruction valide trouvée dans le corps de l'algorithme.", "error");
        return false;
      }

      setInstructions(parsedInstructions);
      setState({
        variables: allDeclarations,
        console: [{ text: "Analyse terminée avec succès. Lancement...", type: 'system' as const, timestamp: new Date() }],
        currentLine: parsedInstructions[0].lineNumber,
        instructionIndex: 0,
        isRunning: true,
        isPausedForInput: false,
        inputTarget: null,
        inputBuffer: [],
        evaluation: null
      });
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
            const finalState: ProgramState = { ...prev, isRunning: false, currentLine: 0 };
            return { ...finalState, evaluation: calculateQualityScore(finalState) };
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
        const errorState: ProgramState = { ...prev, console: newConsole, isRunning: false };
        return { ...errorState, evaluation: calculateQualityScore(errorState) };
      }

      let isFinished = false;
      if (nextIndex >= instructions.length && !nextIsPaused) {
          newConsole.push({ text: "Algorithme terminé avec succès.", type: 'system' as const, timestamp: new Date() });
          isFinished = true;
      }

      const nextState: ProgramState = {
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

      if (isFinished) {
        return { ...nextState, evaluation: calculateQualityScore(nextState) };
      }

      return nextState;
    });
  }, [instructions, calculateQualityScore]);

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
        const nextTarget = prev.inputBuffer[0] || null;
        const nextBuffer = prev.inputBuffer.slice(1);
        
        const isActuallyFinished = !nextTarget && (prev.instructionIndex + 1 >= instructions.length);

        const newConsole: ConsoleMessage[] = [
          ...prev.console, 
          { text: promptValue, type: 'input' as const, timestamp: new Date() }
        ];

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
          evaluation: prev.evaluation
        };

        if (isActuallyFinished && !nextTarget) {
          const finalConsole: ConsoleMessage[] = [
            ...newConsole,
            { text: "Algorithme terminé avec succès.", type: 'system' as const, timestamp: new Date() }
          ];
          const finalState: ProgramState = { ...nextState, console: finalConsole, isRunning: false, currentLine: 0 };
          return { ...finalState, evaluation: calculateQualityScore(finalState) };
        }

        return nextState;
      });
      setPromptValue('');
    } catch (e: any) {
      addConsole(`Erreur de type : ${e.message}`, 'error');
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
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">AbdoBox</h1>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Analyseur Scolaire</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tronc Commun v2.0</span>
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
            Lancer l'Algorithme
          </button>
          <button 
            onClick={() => { if (!state.isRunning) prepareExecution(); else { isAutoStepRef.current = false; executeNextStep(); } }}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl font-bold transition-all shadow-sm active:scale-95"
          >
            <StepForward className="w-4 h-4" />
            Étape par Étape
          </button>
          <button onClick={resetProgram} className="px-6 py-2.5 bg-slate-100 text-slate-500 rounded-xl font-bold transition-all hover:bg-slate-200 active:scale-95 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 gap-4 relative">
        <section className="flex-[3] flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" />
                Editeur (Respect strict du ';')
            </div>
          </div>
          <CodeEditor value={code} onChange={setCode} currentLine={state.currentLine} />
        </section>

        <section className="flex-[2] flex flex-col gap-4 min-h-0">
          <div className="flex-[3] flex flex-col min-h-0 relative">
            <Terminal messages={state.console} />
            {state.evaluation && (
              <QualityScorePanel 
                evaluation={state.evaluation} 
                onClose={() => setState(prev => ({ ...prev, evaluation: null }))} 
              />
            )}
            {state.isPausedForInput && (
              <div className="absolute inset-x-4 bottom-4 p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 z-30">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h3 className="text-white text-xs font-bold uppercase tracking-tighter">Attente de saisie : <span className="text-indigo-400 font-mono">{state.inputTarget}</span></h3>
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
              {state.isRunning ? 'En exécution' : 'Prêt'}
            </span>
          </div>
          {state.currentLine > 0 && <div className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Ligne active : {state.currentLine}</div>}
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3 h-3 text-indigo-400" />
          AbdoBox - Module 3 - Tronc Commun
        </div>
      </footer>
    </div>
  );
};

export default App;
