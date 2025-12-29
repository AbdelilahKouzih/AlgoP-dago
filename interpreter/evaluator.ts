
import { Variable, DataType } from '../types';

export const evaluateExpression = (expr: string, variables: Map<string, Variable>): any => {
  let processed = expr.trim();

  // Gestion des chaînes de caractères littérales pour ne pas remplacer les variables dedans
  // On remplace temporairement les strings par des placeholders
  const strings: string[] = [];
  processed = processed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    strings.push(match);
    return `__STR${strings.length - 1}__`;
  });

  // Remplacement des booléens
  processed = processed.replace(/\bvrai\b/gi, 'true').replace(/\bfaux\b/gi, 'false');
  
  // Opérateurs logiques
  processed = processed.replace(/\bET\b/gi, '&&');
  processed = processed.replace(/\bOU\b/gi, '||');
  processed = processed.replace(/\bNON\b/gi, '!');

  // Comparaison
  processed = processed.replace(/<>/g, '!==');
  processed = processed.replace(/=(?!=)/g, '==='); // Remplace = par === mais pas <= ou >=

  // Remplacement des variables par leurs valeurs
  const varNames = Array.from(variables.keys()).sort((a, b) => b.length - a.length);
  varNames.forEach(name => {
    const v = variables.get(name);
    if (!v) return;
    
    if (v.value === undefined) {
      // On laisse tel quel pour qu'eval lève éventuellement une erreur si utilisé
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      processed = processed.replace(regex, 'undefined');
    } else {
      const val = v.value;
      const formattedVal = typeof val === 'string' ? `"${val}"` : val;
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      processed = processed.replace(regex, String(formattedVal));
    }
  });

  // Restauration des chaînes
  strings.forEach((str, i) => {
    processed = processed.replace(`__STR${i}__`, str);
  });

  try {
    // eslint-disable-next-line no-eval
    const result = eval(processed);
    if (result === undefined || (typeof result === 'number' && isNaN(result))) {
      throw new Error("Valeur indéfinie ou calcul impossible");
    }
    return result;
  } catch (e) {
    throw new Error(`Expression invalide ou variable non initialisée : ${expr}`);
  }
};

export const castValue = (value: string, type: DataType): any => {
  const v = value.trim();
  switch (type) {
    case 'entier':
      const i = parseInt(v, 10);
      if (isNaN(i)) throw new Error(`"${v}" n'est pas un entier valide.`);
      return i;
    case 'réel':
      const f = parseFloat(v.replace(',', '.'));
      if (isNaN(f)) throw new Error(`"${v}" n'est pas un nombre réel valide.`);
      return f;
    case 'booléen':
      const b = v.toLowerCase();
      if (b === 'vrai' || b === 'true') return true;
      if (b === 'faux' || b === 'false') return false;
      throw new Error(`"${v}" n'est pas un booléen (vrai/faux).`);
    case 'chaîne de caractères':
    default:
      return v;
  }
};
