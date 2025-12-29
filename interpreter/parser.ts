
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
        content: trimmed.replace(/;$/, ''), // On retire le point-virgule pour l'exécution
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
  const typesAutorises = ['entier', 'réel', 'chaîne de caractères', 'chaine de caractères', 'caractère', 'booléen'];

  // 1. Ordre et Mots-clés de base
  const algoIdx = lowerLines.findIndex(l => l.startsWith('algorithme'));
  if (algoIdx === -1) return "Erreur : L'algorithme doit commencer par le mot-clé 'Algorithme [Nom]'.";
  
  const debutIdx = lowerLines.findIndex(l => l === 'début' || l === 'debut');
  const finIdx = lowerLines.lastIndexOf('fin');
  if (debutIdx === -1) return "Erreur : Le mot-clé 'Début' est manquant pour marquer le commencement des instructions.";
  if (finIdx === -1) return "Erreur : Le mot-clé 'Fin' est manquant pour clore l'algorithme.";
  if (debutIdx > finIdx) return "Erreur : Le mot-clé 'Début' doit se situer avant le mot-clé 'Fin'.";

  // Mots-clés structurels qui ne DOIVENT PAS avoir de point-virgule selon la règle des exceptions
  const exceptionsPointVirgule = ['algorithme', 'constantes', 'variables', 'début', 'debut', 'fin', 'si', 'alors', 'sinon', 'fin si', 'finsi'];

  let inVariablesBlock = false;
  let inConstantsBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lowerLine = line.toLowerCase();

    // Gestion des blocs pour vérification sémantique
    if (lowerLine.startsWith('variables')) { inVariablesBlock = true; inConstantsBlock = false; }
    else if (lowerLine.startsWith('constantes')) { inConstantsBlock = true; inVariablesBlock = false; }
    else if (lowerLine === 'début' || lowerLine === 'debut') { inVariablesBlock = false; inConstantsBlock = false; }

    // --- VÉRIFICATION DU POINT-VIRGULE ---
    // On vérifie si la ligne contient uniquement un mot-clé structurel d'exception
    const isException = exceptionsPointVirgule.some(exc => {
        if (exc === 'algorithme' && lowerLine.startsWith('algorithme')) return true;
        if (exc === 'si' && lowerLine.startsWith('si ')) return true;
        if (exc === 'fin si' && (lowerLine === 'fin si' || lowerLine === 'finsi')) return true;
        return lowerLine === exc;
    });

    if (!isException) {
        if (!line.endsWith(';')) {
            return `Ligne ${i + 1} : Chaque instruction ou déclaration doit se terminer par un point-virgule ';'.`;
        }
    } else {
        // Si c'est une exception mais qu'il y a un point-virgule à la fin, c'est aussi une erreur selon la consigne "ne doivent pas contenir de point-virgule"
        if (line.endsWith(';')) {
            return `Ligne ${i + 1} : Le mot-clé structurel '${line.replace(';', '')}' ne doit pas se terminer par un point-virgule.`;
        }
    }

    // --- VÉRIFICATION DES DÉCLARATIONS ---
    if (i < debutIdx && !lowerLine.startsWith('algorithme')) {
        // On est dans la zone de déclaration
        if (lowerLine.includes(':')) { // C'est une déclaration de variable
            if (inConstantsBlock) return `Ligne ${i + 1} : Vous essayez de déclarer une variable (avec ':') dans le bloc des 'Constantes'.`;
            
            const typePart = line.replace(/;$/, '').split(':').pop()?.trim().toLowerCase() || '';
            if (!typesAutorises.includes(typePart)) {
                return `Ligne ${i + 1} : Type '${typePart}' non reconnu. Les types autorisés sont : entier, réel, chaine de caractères, caractère, booléen.`;
            }
        }
        
        if (lowerLine.includes('=') && !lowerLine.startsWith('constante')) { // C'est une déclaration de constante
            if (inVariablesBlock) return `Ligne ${i + 1} : Vous essayez de déclarer une constante (avec '=') dans le bloc des 'Variables'.`;
        }
    }

    // --- ANALYSE DU CORPS (DÉBUT...FIN) ---
    if (i > debutIdx && i < finIdx) {
        // Vérification des variables utilisées
        if (lowerLine.startsWith('ecrire')) {
            if (!line.includes('(') || !line.includes(')')) return `Ligne ${i + 1} : L'instruction 'Ecrire' nécessite des parenthèses.`;
        }
        
        if (lowerLine.startsWith('lire')) {
            const match = line.match(/Lire\s*\((.*)\)/i);
            if (!match) return `Ligne ${i + 1} : Syntaxe de 'Lire' incorrecte.`;
            const varNames = match[1].replace(/;$/, '').split(',').map(v => v.trim());
            for (const v of varNames) {
                if (!symbols.has(v)) return `Ligne ${i + 1} : La variable '${v}' n'est pas déclarée.`;
                if (symbols.get(v)?.isConstant) return `Ligne ${i + 1} : '${v}' est une constante et ne peut être utilisée avec 'Lire'.`;
            }
        }

        if (line.includes('←') || line.includes('<-')) {
            const sep = line.includes('←') ? '←' : '<-';
            const varName = line.split(sep)[0].trim();
            const symbol = symbols.get(varName);
            if (!symbol) return `Ligne ${i + 1} : La variable '${varName}' n'est pas déclarée.`;
            if (symbol.isConstant) return `Ligne ${i + 1} : '${varName}' est une constante et ne peut pas être modifiée.`;
        }
    }
  }

  // Vérification des structures SI
  let siStack = 0;
  for (let i = debutIdx + 1; i < finIdx; i++) {
    const lower = lines[i].trim().toLowerCase();
    if (lower.startsWith('si ')) siStack++;
    if (lower === 'fin si' || lower === 'finsi') siStack--;
  }
  if (siStack > 0) return "Erreur : Une structure 'Si' n'est pas fermée par 'Fin si'.";
  if (siStack < 0) return "Erreur : 'Fin si' sans 'Si' correspondant.";

  return null;
};
