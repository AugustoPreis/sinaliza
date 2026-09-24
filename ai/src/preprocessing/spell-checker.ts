import nspell, { type NSpell } from 'nspell';
import dictionary from 'dictionary-pt';
import { compactDictionary, SAFE_CORRECTION_TARGETS } from './compact-portuguese-dictionary.js';
import { INSTITUTIONAL_TERMS, isInstitutionalTerm } from './institutional-dictionary.js';

let checkerPromise: Promise<NSpell> | undefined;
let portugueseWords: Set<string> | undefined;
const correctionCache = new Map<string, string>();

function getPortugueseWords(): Set<string> {
  if (portugueseWords) return portugueseWords;
  const content = new TextDecoder('utf-8').decode(dictionary.dic);
  portugueseWords = new Set(
    content.split(/\r?\n/u).slice(1)
      .map((line) => line.split(/[/\t]/u, 1)[0]?.toLocaleLowerCase('pt-BR'))
      .filter((word): word is string => Boolean(word)),
  );
  return portugueseWords;
}

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitution = previous[rightIndex - 1]! + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(current[rightIndex - 1]! + 1, previous[rightIndex]! + 1, substitution);
    }
    previous = current;
  }
  return previous[right.length]!;
}

export function selectUnambiguousCorrection(word: string, suggestions: string[]): string | undefined {
  const ranked = suggestions.map((suggestion) => ({ suggestion, distance: editDistance(word.toLocaleLowerCase('pt-BR'), suggestion.toLocaleLowerCase('pt-BR')) }));
  const minimum = Math.min(...ranked.map((item) => item.distance));
  const best = ranked.filter((item) => item.distance === minimum && item.distance <= 2);
  return best.length === 1 ? best[0]!.suggestion : undefined;
}

export function createSpellChecker(): Promise<NSpell> {
  checkerPromise ??= Promise.resolve().then(() => {
    const checker = nspell(compactDictionary());
    for (const term of INSTITUTIONAL_TERMS) checker.add(term);
    return checker;
  });
  return checkerPromise;
}

export async function correctSpelling(text: string): Promise<string> {
  const checker = await createSpellChecker();
  return text.replace(/\p{L}+/gu, (word) => {
    const cached = correctionCache.get(word);
    if (cached) return cached;
    if (
      word.length < 4 || isInstitutionalTerm(word) || checker.correct(word)
      || getPortugueseWords().has(word.toLocaleLowerCase('pt-BR'))
    ) {
      correctionCache.set(word, word);
      return word;
    }
    // Corrige apenas quando existe uma única melhor sugestão próxima.
    const suggestion = selectUnambiguousCorrection(word, checker.suggest(word));
    const corrected = suggestion && SAFE_CORRECTION_TARGETS.has(suggestion.toLocaleLowerCase('pt-BR')) ? suggestion : word;
    correctionCache.set(word, corrected);
    return corrected;
  });
}
