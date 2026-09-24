declare module 'nspell' {
  export interface Dictionary { aff: Uint8Array | string; dic?: Uint8Array | string }
  export interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string, model?: string): void;
    remove(word: string): void;
  }
  export default function nspell(dictionary: Dictionary): NSpell;
}
