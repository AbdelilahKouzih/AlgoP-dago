
import { Instruction, InstructionType } from '../types';

export const parseCode = (code: string): Instruction[] => {
  const lines = code.split('\n');
  const instructions: Instruction[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const lower = trimmed.toLowerCase();
    
    // On ignore les lignes de méta-données pour l'exécution pure
    if (lower.startsWith('algorithme')) return;
    
    // Détection du type d'instruction
    let type: InstructionType | null = null;

    if (lower === 'début' || lower === 'debut') type = 'DEBUT';
    else if (lower === 'fin') type = 'FIN';
    else if (lower.startsWith('si ')) type = 'SI';
    else if (lower === 'sinon') type = 'SINON';
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
