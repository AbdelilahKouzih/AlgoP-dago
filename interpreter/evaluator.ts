
import { Variable, DataType } from '../types';

export const evaluateExpression = (expr: string, variables: Map<string, Variable>): any => {
  let processed = expr.trim();

  // 1. Protection des chaînes littérales présentes dans l'expression (ex: A = "test")
  const literalStrings: string[] = [];
  processed = processed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    literalStrings.push(match);
    return `__LITSTR${literalStrings.length - 1}__`;
  });

  // 2. Remplacement des mots-clés logiques (insensible à la casse)
  processed = processed.replace(/\bvrai\b/gi, 'true');
  processed = processed.replace(/\bfaux\b/gi, 'false');
  processed = processed.replace(/\bET\b/gi, '&&');
  processed = processed.replace(/\bOU\b/gi, '||');
  processed = processed.replace(/\bNON\b/gi, '!');

  // 3. Remplacement des opérateurs de comparaison
  // On utilise des jetons temporaires pour ne pas corrompre les opérateurs composés (>=, <=)
  processed = processed.replace(/<>/g, '!==');
  processed = processed.replace(/<=/g, '__LE__');
  processed = processed.replace(/>=/g, '__GE__');
  processed = processed.replace(/=(?!=)/g, '==='); // Remplace = par === seulement s'il n'est pas déjà suivi d'un =
  processed = processed.replace(/__LE__/g, '<=');
  processed = processed.replace(/__GE__/g, '>=');

  // 4. Injection des variables et constantes dans l'expression
  // On trie par longueur décroissante pour éviter les remplacements partiels (ex: 'A' dans 'AB')
  const names = Array.from(variables.keys()).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const v = variables.get(name);
    if (!v) continue;
    
    let val = v.value;
    // Valeurs par défaut si non défini
    if (val === undefined) {
      if (v.type === 'chaîne de caractères') val = "";
      else if (v.type === 'booléen') val = false;
      else val = 0;
    }

    // Préparation de la valeur pour l'injection JS
    let injection: string;
    if (typeof val === 'string') {
      // On s'assure que la chaîne est entourée de guillemets pour eval
      injection = `"${val.replace(/"/g, '\\"')}"`;
    } else {
      injection = String(val);
    }

    const regex = new RegExp(`\\b${name}\\b`, 'g');
    processed = processed.replace(regex, injection);
  }

  // 5. Restauration des chaînes littérales protégées
  literalStrings.forEach((str, i) => {
    processed = processed.replace(`__LITSTR${i}__`, str);
  });

  try {
    // eslint-disable-next-line no-eval
    return eval(processed);
  } catch (e) {
    console.error("Échec de l'évaluation :", processed, e);
    throw new Error(`Expression invalide ou valeur manquante.`);
  }
};

export const castValue = (value: string, type: DataType): any => {
  const v = value.trim();
  switch (type) {
    case 'entier':
      const i = parseInt(v, 10);
      if (isNaN(i)) throw new Error(`Entrée non entière.`);
      return i;
    case 'réel':
      const f = parseFloat(v.replace(',', '.'));
      if (isNaN(f)) throw new Error(`Entrée non réelle.`);
      return f;
    case 'booléen':
      const b = v.toLowerCase();
      if (b === 'vrai' || b === 'true') return true;
      if (b === 'faux' || b === 'false') return false;
      throw new Error(`Entrée non booléenne.`);
    case 'chaîne de caractères':
    default:
      return v;
  }
};
