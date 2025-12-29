
import { Variable, DataType } from '../types';

/**
 * Évalue une expression pseudo-code en respectant les règles pédagogiques.
 * Gère les opérateurs : +, -, *, /, DIV, MOD, =, <>, <, >, <=, >=
 */
export const evaluateExpression = (expr: string, variables: Map<string, Variable>): any => {
  let processed = expr.trim();

  // 1. Protection des chaînes littérales (ex: "Bonjour")
  const literalStrings: string[] = [];
  processed = processed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    literalStrings.push(match);
    return `__LITSTR${literalStrings.length - 1}__`;
  });

  // 2. Remplacement des opérateurs arithmétiques spéciaux
  processed = processed.replace(/\bDIV\b/g, '/');
  processed = processed.replace(/\bMOD\b/g, '%');

  // 3. Remplacement des mots-clés logiques
  processed = processed.replace(/\bvrai\b/gi, 'true');
  processed = processed.replace(/\bfaux\b/gi, 'false');
  processed = processed.replace(/\bET\b/gi, '&&');
  processed = processed.replace(/\bOU\b/gi, '||');
  processed = processed.replace(/\bNON\b/gi, '!');

  // 4. Opérateurs de comparaison académiques
  processed = processed.replace(/<>/g, '!==');
  processed = processed.replace(/<=/g, '__LE__');
  processed = processed.replace(/>=/g, '__GE__');
  processed = processed.replace(/=(?!=)/g, '==='); 
  processed = processed.replace(/__LE__/g, '<=');
  processed = processed.replace(/__GE__/g, '>=');

  // 5. Injection des variables et constantes
  const names = Array.from(variables.keys()).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const v = variables.get(name);
    if (!v) continue;
    
    let val = v.value;
    if (val === undefined) {
      if (v.type === 'chaîne de caractères' || v.type === 'chaine de caractères' || v.type === 'caractère') val = "";
      else if (v.type === 'booléen') val = false;
      else val = 0;
    }

    let injection: string;
    if (typeof val === 'string') {
      injection = `"${val.replace(/"/g, '\\"')}"`;
    } else {
      injection = String(val);
    }

    const regex = new RegExp(`\\b${name}\\b`, 'g');
    processed = processed.replace(regex, injection);
  }

  // 6. Restauration des chaînes littérales
  literalStrings.forEach((str, i) => {
    processed = processed.replace(`__LITSTR${i}__`, str);
  });

  const containsDIV = expr.includes('DIV');

  try {
    if (/\/\s*0(?!\.)/.test(processed) || /%\s*0(?!\.)/.test(processed)) {
      throw new Error("Division ou Modulo par zéro impossible.");
    }

    // eslint-disable-next-line no-eval
    let result = eval(processed);

    if (containsDIV && typeof result === 'number') {
      result = Math.trunc(result);
    }

    return result;
  } catch (e: any) {
    if (e.message.includes("zéro")) throw e;
    throw new Error(`Expression incorrecte. Vérifiez les types ou l'écriture.`);
  }
};

/**
 * Convertit une chaîne saisie par l'utilisateur vers le type attendu.
 */
export const castValue = (value: string, type: DataType): any => {
  const v = value.trim();
  const lower = v.toLowerCase();
  
  switch (type) {
    case 'entier':
      const i = parseInt(v, 10);
      if (isNaN(i) || v.includes('.') || v.includes(',')) throw new Error(`La valeur doit être un nombre entier sans virgule.`);
      return i;
    case 'réel':
      const f = parseFloat(v.replace(',', '.'));
      if (isNaN(f)) throw new Error(`La valeur doit être un nombre réel.`);
      return f;
    case 'booléen':
      if (lower === 'vrai' || lower === 'true') return true;
      if (lower === 'faux' || lower === 'false') return false;
      throw new Error(`La valeur doit être 'vrai' ou 'faux'.`);
    case 'caractère':
      if (v.length !== 1) throw new Error(`Un caractère doit être une seule lettre ou symbole.`);
      return v;
    case 'chaîne de caractères':
    case 'chaine de caractères':
    default:
      return v;
  }
};
