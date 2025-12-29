
import { Instruction, InstructionType } from '../types';

export const parseCode = (code: string): Instruction[] => {
  const lines = code.split('\n');
  const instructions: Instruction[] = [];
  let inProgram = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const lower = trimmed.toLowerCase();
    
    // On repère le début et la fin pour l'exécution
    if (lower === 'début' || lower === 'debut') {
      inProgram = true;
    }
    
    // Détection du type pour l'exécution
    let type: InstructionType | null = null;
    if (lower === 'début' || lower === 'debut') type = 'DEBUT';
    else if (lower === 'fin') { type = 'FIN'; inProgram = false; }
    else if (lower.startsWith('si ')) type = 'SI';
    else if (lower === 'sinon') type = 'SINON';
    else if (lower.replace(/\s/g, '').startsWith('finsi')) type = 'FIN_SI';
    else if (lower.startsWith('ecrire')) type = 'ECRIRE';
    else if (lower.startsWith('lire')) type = 'LIRE';
    else if (trimmed.includes('←') || trimmed.includes('<-')) type = 'AFFECTATION';

    if (type && (inProgram || type === 'DEBUT' || type === 'FIN')) {
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

export const parseVariables = (code: string): Map<string, { type: string }> => {
  const vars = new Map<string, { type: string }>();
  const lines = code.split('\n');
  let inVariablesBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('variables')) {
      inVariablesBlock = true;
      continue;
    }
    if (lower === 'début' || lower === 'debut') break;

    if (inVariablesBlock && trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const type = parts[parts.length - 1].trim().toLowerCase();
      const namesPart = parts.slice(0, -1).join(':');
      const names = namesPart.split(',').map(n => n.trim());
      names.forEach(name => {
        if (name) vars.set(name, { type });
      });
    }
  }
  return vars;
};

export const validateSyntax = (code: string): string | null => {
  const lines = code.split('\n');
  const lowerLines = lines.map(l => l.trim().toLowerCase());
  const declaredVars = parseVariables(code);
  const typesAutorises = ['entier', 'réel', 'chaîne de caractères', 'booléen', 'chaine de caracteres'];

  // 1. Vérification de l'ordre global des blocs
  const algoIdx = lowerLines.findIndex(l => l.startsWith('algorithme'));
  const varIdx = lowerLines.findIndex(l => l.startsWith('variables'));
  const debutIdx = lowerLines.findIndex(l => l === 'début' || l === 'debut');
  const finIdx = lowerLines.lastIndexOf('fin');

  if (algoIdx === -1) return "Erreur : L'algorithme doit commencer par 'Algorithme [Nom] ;'.";
  if (!lines[algoIdx].includes(';')) return `Ligne ${algoIdx + 1} : Il manque un point-virgule ';' à la fin de la déclaration de l'algorithme.`;
  
  if (debutIdx === -1) return "Erreur : Le mot-clé 'Début' est obligatoire pour marquer le début des instructions.";
  if (finIdx === -1) return "Erreur : Le mot-clé 'Fin' est obligatoire pour marquer la fin de l'algorithme.";
  
  if (varIdx !== -1 && varIdx > debutIdx) return "Erreur : La section 'Variables' doit impérativement se situer AVANT le bloc 'Début'.";
  if (debutIdx > finIdx) return "Erreur : Le mot-clé 'Début' doit apparaître avant le mot-clé 'Fin'.";

  // 2. Vérification détaillée des variables
  if (varIdx !== -1) {
    for (let i = varIdx + 1; i < debutIdx; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (!line.includes(':')) return `Ligne ${i + 1} : Déclaration de variable incorrecte. Format attendu : 'Nom : Type'.`;
      
      const type = line.split(':').pop()?.trim().toLowerCase() || '';
      if (!typesAutorises.some(t => type.includes(t))) {
        return `Ligne ${i + 1} : Type '${type}' inconnu. Les types autorisés sont : entier, réel, chaîne de caractères, booléen.`;
      }
    }
  }

  // 3. Analyse des instructions (Bloc Début...Fin)
  let siStack = 0;
  for (let i = debutIdx + 1; i < finIdx; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    // Vérification de Si...Alors
    if (lower.startsWith('si ')) {
      siStack++;
      if (!lower.includes(' alors')) {
        return `Ligne ${i + 1} : Syntaxe 'Si' incomplète. Il manque le mot-clé 'Alors' après la condition. Forme correcte : 'Si [condition] Alors'.`;
      }
    }

    if (lower.replace(/\s/g, '').startsWith('finsi')) {
      siStack--;
      if (siStack < 0) return `Ligne ${i + 1} : 'Fin si' détecté sans structure 'Si' ouverte correspondante.`;
    }

    if (lower === 'sinon') {
      if (siStack <= 0) return `Ligne ${i + 1} : 'Sinon' utilisé en dehors d'une structure 'Si'.`;
    }

    // Vérification Ecrire / Lire
    if (lower.startsWith('ecrire')) {
      if (!line.match(/Ecrire\s*\(.*\)/i)) {
        return `Ligne ${i + 1} : Syntaxe 'Ecrire' incorrecte. Les parenthèses sont obligatoires. Exemple : Ecrire("Bonjour") ou Ecrire(A).`;
      }
    }

    if (lower.startsWith('lire')) {
      const match = line.match(/Lire\s*\((.*)\)/i);
      if (!match) return `Ligne ${i + 1} : Syntaxe 'Lire' incorrecte. Exemple : Lire(Variable).`;
      const varNames = match[1].split(',').map(v => v.trim());
      for (const v of varNames) {
        if (!declaredVars.has(v)) return `Ligne ${i + 1} : La variable '${v}' n'a pas été déclarée dans la section 'Variables'.`;
      }
    }

    // Vérification Affectation
    if (line.includes('←') || line.includes('<-')) {
      const sep = line.includes('←') ? '←' : '<-';
      const varName = line.split(sep)[0].trim();
      if (!declaredVars.has(varName)) return `Ligne ${i + 1} : La variable '${varName}' (affectation) n'est pas déclarée.`;
    }
  }

  if (siStack > 0) return "Erreur : Une structure 'Si' n'a pas été fermée. N'oubliez pas le 'Fin si'.";

  return null; // Tout est OK
};
