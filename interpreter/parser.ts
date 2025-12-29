
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

    // Détection des débuts de blocs
    if (lower.startsWith('variables')) { inVariablesBlock = true; inConstantsBlock = false; continue; }
    if (lower.startsWith('constantes')) { inConstantsBlock = true; inVariablesBlock = false; continue; }

    // Syntaxe 1: Constante unique sur une ligne
    if (lower.startsWith('constante ')) {
      const content = trimmed.substring(10).replace(/;$/, '').trim();
      if (content.includes('=')) {
        const [name, valRaw] = content.split('=').map(s => s.trim());
        let val = valRaw;
        // Strip quotes if they exist
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        symbols.set(name, { name, type: 'chaîne de caractères', value: val, isConstant: true });
      }
      continue;
    }

    // Syntaxe 1: Variable unique sur une ligne
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

    // Syntaxe 2: Dans un bloc
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

  // 1. Ordre et Mots-clés de base
  const algoIdx = lowerLines.findIndex(l => l.startsWith('algorithme'));
  if (algoIdx === -1) return "Erreur : L'algorithme doit commencer par le mot-clé 'Algorithme [Nom] ;'.";
  if (!lines[algoIdx].includes(';')) return `Ligne ${algoIdx + 1} : Il manque un point-virgule ';' à la fin du nom de l'algorithme. Exemple: Algorithme Somme ;`;

  const debutIdx = lowerLines.findIndex(l => l === 'début' || l === 'debut');
  const finIdx = lowerLines.lastIndexOf('fin');
  if (debutIdx === -1) return "Erreur : Le mot-clé 'Début' est manquant pour marquer le commencement des instructions.";
  if (finIdx === -1) return "Erreur : Le mot-clé 'Fin' est manquant pour clore l'algorithme.";
  if (debutIdx > finIdx) return "Erreur : Le mot-clé 'Début' doit se situer avant le mot-clé 'Fin'.";

  // 2. Vérification des déclarations (Constantes et Variables)
  for (let i = 0; i < debutIdx; i++) {
    const line = lines[i].trim();
    if (!line || lowerLines[i].startsWith('algorithme')) continue;

    const lowerLine = line.toLowerCase();
    // On ne vérifie le point-virgule que pour les lignes effectives de déclaration, pas les entêtes de bloc
    if (line.length > 0 && !['variables', 'constantes', 'début', 'debut'].includes(lowerLine)) {
        if (!line.endsWith(';')) return `Ligne ${i + 1} : Chaque déclaration doit se terminer par un point-virgule ';'.`;
    }

    // Vérification des types pour les variables
    if (line.includes(':')) {
      const typePart = line.replace(/;$/, '').split(':').pop()?.trim().toLowerCase() || '';
      if (!typesAutorises.some(t => typePart.includes(t))) {
        return `Ligne ${i + 1} : Type '${typePart}' non reconnu. Utilisez: entier, réel, chaîne de caractères ou booléen.`;
      }
    }
  }

  // 3. Analyse du corps (Début...Fin)
  let siStack = 0;
  for (let i = debutIdx + 1; i < finIdx; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    // Structures conditionnelles
    if (lower.startsWith('si ')) {
      siStack++;
      if (!lower.includes(' alors')) return `Ligne ${i + 1} : Il manque le mot-clé 'Alors'. La forme correcte est : Si [condition] Alors.`;
    }
    if (lower.replace(/\s/g, '').startsWith('finsi')) {
      siStack--;
      if (siStack < 0) return `Ligne ${i + 1} : 'Fin si' sans 'Si' correspondant.`;
    }
    if (lower === 'sinon' && siStack <= 0) return `Ligne ${i + 1} : 'Sinon' ne peut être utilisé qu'à l'intérieur d'un bloc 'Si'.`;

    // Ecrire / Lire
    if (lower.startsWith('ecrire')) {
      if (!line.includes('(') || !line.includes(')')) return `Ligne ${i + 1} : L'instruction 'Ecrire' nécessite des parenthèses. Exemple: Ecrire("Resultat", A).`;
    }
    if (lower.startsWith('lire')) {
      const match = line.match(/Lire\s*\((.*)\)/i);
      if (!match) return `Ligne ${i + 1} : Syntaxe de 'Lire' incorrecte. Exemple: Lire(A).`;
      const varNames = match[1].split(',').map(v => v.trim());
      for (const v of varNames) {
        if (!symbols.has(v)) return `Ligne ${i + 1} : La variable '${v}' n'est pas déclarée. Toute variable doit être déclarée dans la section 'Variables'.`;
        if (symbols.get(v)?.isConstant) return `Ligne ${i + 1} : Impossible de lire dans '${v}' car c'est une constante.`;
      }
    }

    // Affectation
    if (line.includes('←') || line.includes('<-')) {
      const sep = line.includes('←') ? '←' : '<-';
      const varName = line.split(sep)[0].trim();
      const symbol = symbols.get(varName);
      if (!symbol) return `Ligne ${i + 1} : La variable '${varName}' n'est pas déclarée.`;
      if (symbol.isConstant) return `Ligne ${i + 1} : Erreur fatale ! '${varName}' est une constante et ne peut pas être modifiée par une affectation.`;
    }
  }

  if (siStack > 0) return "Erreur : Une structure 'Si' n'est pas fermée. Pensez à ajouter 'Fin si'.";

  return null;
};
