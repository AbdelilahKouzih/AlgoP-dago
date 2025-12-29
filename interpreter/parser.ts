
import { Instruction, InstructionType } from '../types';

export const parseCode = (code: string): Instruction[] => {
  const lines = code.split('\n');
  const instructions: Instruction[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const lower = trimmed.toLowerCase();
    
    // On ignore les lignes de méta-données et les déclarations pour l'exécution pure
    if (lower.startsWith('algorithme')) return;
    if (lower.startsWith('variables')) return;
    
    let type: InstructionType | null = null;

    if (lower === 'début' || lower === 'debut') type = 'DEBUT';
    else if (lower === 'fin') type = 'FIN';
    else if (lower.startsWith('si ')) type = 'SI';
    else if (lower === 'sinon') type = 'SINON';
    else if (lower.replace(/\s/g, '').startsWith('finsi')) type = 'FIN_SI';
    else if (lower.replace(/\s/g, '').startsWith('finsi')) type = 'FIN_SI';
    else if (lower.startsWith('ecrire')) type = 'ECRIRE';
    else if (lower.startsWith('lire')) type = 'LIRE';
    else if (trimmed.includes('←') || trimmed.includes('<-')) type = 'AFFECTATION';

    if (type) {
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
      if (parts.length >= 2) {
        const type = parts[parts.length - 1].trim().toLowerCase();
        const namesPart = parts.slice(0, -1).join(':');
        const names = namesPart.split(',').map(n => n.trim());
        names.forEach(name => {
          if (name) vars.set(name, { type });
        });
      }
    }
  }

  return vars;
};

export const validateSyntax = (code: string, instructions: Instruction[]): string | null => {
  const lines = code.split('\n');
  const lowerCode = code.toLowerCase();
  const declaredVars = parseVariables(code);
  
  // 1. Vérification des mots-clés de base
  if (!/^\s*algorithme/i.test(code)) return "Erreur : L'algorithme doit commencer par le mot-clé 'Algorithme'.";
  if (!lowerCode.includes('début') && !lowerCode.includes('debut')) return "Erreur : Le bloc 'Début' est obligatoire.";
  if (!lowerCode.includes('fin')) return "Erreur : Le mot-clé 'Fin' est manquant à la fin de l'algorithme.";

  // 2. Vérification des blocs imbriqués et syntaxe spécifique
  let siStack = 0;
  let hasDebut = false;
  let hasFin = false;

  for (const instr of instructions) {
    const lowerContent = instr.content.toLowerCase();

    if (instr.type === 'DEBUT') hasDebut = true;
    if (instr.type === 'FIN') hasFin = true;

    // Vérifier 'Si ... Alors'
    if (instr.type === 'SI') {
      siStack++;
      if (!lowerContent.includes('alors')) {
        return `Erreur ligne ${instr.lineNumber} : Il manque le mot-clé 'Alors' après la condition du 'Si'.`;
      }
    }

    if (instr.type === 'FIN_SI') {
      siStack--;
      if (siStack < 0) return `Erreur ligne ${instr.lineNumber} : 'Fin si' sans 'Si' correspondant.`;
    }

    if (instr.type === 'SINON') {
      if (siStack <= 0) return `Erreur ligne ${instr.lineNumber} : 'Sinon' utilisé en dehors d'une structure 'Si'.`;
    }

    // 3. Vérification des variables utilisées
    if (instr.type === 'AFFECTATION') {
      const sep = instr.content.includes('←') ? '←' : '<-';
      const varName = instr.content.split(sep)[0].trim();
      if (!declaredVars.has(varName)) {
        return `Erreur ligne ${instr.lineNumber} : La variable '${varName}' n'est pas déclarée dans la section 'Variables'.`;
      }
    }

    if (instr.type === 'LIRE') {
      const match = instr.content.match(/Lire\s*\((.*)\)/i);
      if (!match) return `Erreur ligne ${instr.lineNumber} : Syntaxe 'Lire' incorrecte. Utilisez 'Lire(variable)'.`;
      const vars = match[1].split(',').map(v => v.trim());
      for (const v of vars) {
        if (!declaredVars.has(v)) {
          return `Erreur ligne ${instr.lineNumber} : La variable '${v}' utilisée dans 'Lire' n'est pas déclarée.`;
        }
      }
    }

    if (instr.type === 'ECRIRE') {
      if (!instr.content.match(/Ecrire\s*\(.*\)/i)) {
        return `Erreur ligne ${instr.lineNumber} : Syntaxe 'Ecrire' incorrecte. Utilisez 'Ecrire("message", variable)'.`;
      }
    }
  }

  if (siStack > 0) return "Erreur : Une structure 'Si' n'a pas été fermée par 'Fin si'.";
  if (!hasDebut) return "Erreur : Le mot-clé 'Début' est introuvable ou mal placé.";
  if (!hasFin) return "Erreur : Le mot-clé 'Fin' est introuvable.";

  return null;
};
