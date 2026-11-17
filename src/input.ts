import type { Food } from "./types";
export function matches(text: string, foods: Food[]) {
  const norm = (s: string) =>
    s
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const target = norm(text);
  return target
    ? foods.filter(
        (f) =>
          !f.archived &&
          [f.name, ...(f.aliases || [])].some((n) => norm(n) === target),
      )
    : [];
}
export class Operation {
  private id = 0;
  start() {
    return ++this.id;
  }
  cancel() {
    ++this.id;
  }
  current(id: number) {
    return this.id === id;
  }
}
export type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
export function recognitionConstructor():
  | (new () => RecognitionLike)
  | undefined {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}
