
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
  // DIV (Division entière) : On remplace par une fonction qui vérifie les types
  // MOD (Modulo) : On remplace par %
  // / (Division réelle) : On garde /
  
  // Utilisation d'une regex pour capturer les opérandes autour de DIV et MOD
  // pour vérification sémantique (simplifiée ici via eval d'une fonction d'aide)
  processed = processed.replace(/\bDIV\b/g, '/'); // Sera tronqué plus tard
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
  processed = processed.replace(/=(?!=)/g, '==='); // Transforme = en === (si pas suivi de =)
  processed = processed.replace(/__LE__/g, '<=');
  processed = processed.replace(/__GE__/g, '>=');

  // 5. Injection des variables et constantes
  const names = Array.from(variables.keys()).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const v = variables.get(name);
    if (!v) continue;
    
    let val = v.value;
    if (val === undefined) {
      if (v.type === 'chaîne de caractères') val = "";
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

  // 7. Gestion de la division entière (DIV) après injection
  // Si l'expression contenait DIV, on doit s'assurer du résultat entier
  const containsDIV = expr.includes('DIV');

  try {
    // Vérification de division par zéro avant eval
    if (/\/\s*0(?!\.)/.test(processed) || /%\s*0(?!\.)/.test(processed)) {
      throw new Error("Division ou Modulo par zéro impossible.");
    }

    // eslint-disable-next-line no-eval
    let result = eval(processed);

    // Si c'était un DIV, on tronque (Math.trunc pour gérer les négatifs correctement)
    if (containsDIV && typeof result === 'number') {
      result = Math.trunc(result);
    }

    return result;
  } catch (e: any) {
    if (e.message.includes("zéro")) throw e;
    console.error("Échec éval:", processed, e);
    throw new Error(`Expression incorrecte. Vérifiez les opérateurs ou les types.`);
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
    case 'chaîne de caractères':
    default:
      return v;
  }
};
