
import { Instruction, InstructionType, Variable, DataType } from '../types';

export const parseCode = (code: string): Instruction[] => {
  const lines = code.split('\n');
  const instructions: Instruction[] = [];
  let inProgram = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    
    if (lower === 'début' || lower === 'debut') inProgram = true;
    
    let type: InstructionType | null = null;
    if (lower === 'début' || lower === 'debut') type = 'DEBUT';
    else if (lower === 'fin') { type = 'FIN'; inProgram = false; }
    else if (lower.startsWith('si ')) type = 'SI';
    else if (lower === 'sinon') type = 'SINON';
    else if (lower.replace(/\s/g, '').startsWith('finsi')) type = 'FIN_SI';
    else if (lower.startsWith('ecrire')) type = 'ECRIRE';
    else if (lower.startsWith('lire')) type = 'LIRE';
    else if (trimmed.includes('←') || trimmed.includes('<-')) type = 'AFFECTATION';

    if (type && inProgram) {
      instructions.push({
        type,
        content: trimmed,
        lineNumber: index + 1,
        raw: line
      });
    } else if (type === 'DEBUT' || type === 'FIN') {
        instructions.push({
            type,
            content: trimmed,
            lineNumber: index + 1,
            raw: line
          });
    }
  });

  return instructions;
};

export const parseAllDeclarations = (code: string): Map<string, Variable> => {
  const symbols = new Map<string, Variable>();
  const lines = code.split('\n');
  let inVariablesBlock = false;
  let inConstantsBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (lower === 'début' || lower === 'debut') break;

    if (lower.startsWith('variables')) { inVariablesBlock = true; inConstantsBlock = false; continue; }
    if (lower.startsWith('constantes')) { inConstantsBlock = true; inVariablesBlock = false; continue; }

    if (lower.startsWith('constante ')) {
      const content = trimmed.substring(10).replace(/;$/, '').trim();
      if (content.includes('=')) {
        const [name, valRaw] = content.split('=').map(s => s.trim());
        let val = valRaw;
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        symbols.set(name, { name, type: 'chaîne de caractères', value: val, isConstant: true });
      }
      continue;
    }

    if (lower.startsWith('variable ')) {
      const content = trimmed.substring(9).replace(/;$/, '').trim();
      if (content.includes(':')) {
        const parts = content.split(':');
        const type = parts.pop()?.trim() as DataType;
        const names = parts.join(':').split(',').map(n => n.trim());
        names.forEach(n => symbols.set(n, { name: n, type, value: undefined, isConstant: false }));
      }
      continue;
    }

    if (inConstantsBlock && trimmed.includes('=')) {
      const [name, valRaw] = trimmed.replace(/;$/, '').split('=').map(s => s.trim());
      let val = valRaw;
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      symbols.set(name, { name, type: 'chaîne de caractères', value: val, isConstant: true });
    } else if (inVariablesBlock && trimmed.includes(':')) {
      const parts = trimmed.replace(/;$/, '').split(':');
      const type = parts.pop()?.trim() as DataType;
      const names = parts.join(':').split(',').map(n => n.trim());
      names.forEach(n => symbols.set(n, { name: n, type, value: undefined, isConstant: false }));
    }
  }
  return symbols;
};

export const validateSyntax = (code: string): string | null => {
  const lines = code.split('\n');
  const lowerLines = lines.map(l => l.trim().toLowerCase());
  const symbols = parseAllDeclarations(code);
  const typesAutorises = ['entier', 'réel', 'chaîne de caractères', 'booléen', 'chaine de caracteres'];

  const algoIdx = lowerLines.findIndex(l => l.startsWith('algorithme'));
  if (algoIdx === -1) return "Erreur : L'algorithme doit commencer par 'Algorithme [Nom] ;'.";
  if (!lines[algoIdx].includes(';')) return `Ligne ${algoIdx + 1} : Il manque un ';' à la fin du nom de l'algorithme.`;

  const debutIdx = lowerLines.findIndex(l => l === 'début' || l === 'debut');
  const finIdx = lowerLines.lastIndexOf('fin');
  if (debutIdx === -1) return "Erreur : Le mot-clé 'Début' est manquant.";
  if (finIdx === -1) return "Erreur : Le mot-clé 'Fin' est manquant.";

  for (let i = 0; i < debutIdx; i++) {
    const line = lines[i].trim();
    if (!line || lowerLines[i].startsWith('algorithme')) continue;
    const lowerLine = line.toLowerCase();
    if (line.length > 0 && !['variables', 'constantes', 'début', 'debut'].includes(lowerLine)) {
        if (!line.endsWith(';')) return `Ligne ${i + 1} : Déclaration incomplète (manque ';').`;
    }
    if (line.includes(':')) {
      const typePart = line.replace(/;$/, '').split(':').pop()?.trim().toLowerCase() || '';
      if (!typesAutorises.some(t => typePart.includes(t))) {
        return `Ligne ${i + 1} : Type '${typePart}' inconnu. Utilisez: entier, réel, chaîne de caractères ou booléen.`;
      }
    }
  }

  let siStack = 0;
  for (let i = debutIdx + 1; i < finIdx; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    // Vérification des opérateurs DIV et MOD
    // Ils doivent être en majuscules selon la consigne
    if (line.includes(' div ')) return `Ligne ${i + 1} : L'opérateur de division entière doit s'écrire 'DIV' en majuscules.`;
    if (line.includes(' mod ')) return `Ligne ${i + 1} : L'opérateur modulo doit s'écrire 'MOD' en majuscules.`;

    if (lower.startsWith('si ')) {
      siStack++;
      if (!lower.includes(' alors')) return `Ligne ${i + 1} : 'Si' sans 'Alors'. Syntaxe : Si [condition] Alors.`;
    }
    if (lower.replace(/\s/g, '').startsWith('finsi')) {
      siStack--;
      if (siStack < 0) return `Ligne ${i + 1} : 'Fin si' inattendu.`;
    }

    if (lower.startsWith('ecrire') && (!line.includes('(') || !line.includes(')'))) {
        return `Ligne ${i + 1} : 'Ecrire' nécessite des parenthèses.`;
    }

    if (lower.startsWith('lire')) {
      const match = line.match(/Lire\s*\((.*)\)/i);
      if (!match) return `Ligne ${i + 1} : Syntaxe 'Lire' incorrecte.`;
      const varNames = match[1].split(',').map(v => v.trim());
      for (const v of varNames) {
        if (!symbols.has(v)) return `Ligne ${i + 1} : Variable '${v}' non déclarée.`;
      }
    }

    if (line.includes('←') || line.includes('<-')) {
      const sep = line.includes('←') ? '←' : '<-';
      const varName = line.split(sep)[0].trim();
      const symbol = symbols.get(varName);
      if (!symbol) return `Ligne ${i + 1} : Variable '${varName}' non déclarée.`;
      if (symbol.isConstant) return `Ligne ${i + 1} : Impossible de modifier la constante '${varName}'.`;
      
      // Vérification sémantique simplifiée pour DIV/MOD
      const expr = line.split(sep)[1].trim();
      if (expr.includes('DIV') || expr.includes('MOD')) {
          // On pourrait ici vérifier si les opérandes sont bien des entiers
          // Mais cela nécessite une analyse lexicale plus profonde.
      }
    }
    
    // Empêcher l'utilisation de = pour l'affectation
    if (line.includes('=') && !line.startsWith('Si') && !line.includes('Constante') && !line.includes('<-') && !line.includes('←')) {
        // Si la ligne contient un = mais n'est pas une condition ou une constante ou une affectation correcte
        // C'est probablement une erreur d'affectation
        const beforeEqual = line.split('=')[0].trim();
        if (symbols.has(beforeEqual)) {
            return `Ligne ${i + 1} : Pour l'affectation, utilisez '←' ou '<-' au lieu de '='.`;
        }
    }
  }

  if (siStack > 0) return "Erreur : Une structure 'Si' n'est pas fermée par 'Fin si'.";

  return null;
};
