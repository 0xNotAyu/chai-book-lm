// src/types/node-webvtt.d.ts

declare module "node-webvtt" {
  interface Cue {
    identifier: string;
    start: number;
    end: number;
    text: string;
    styles: string;
  }

  interface ParseResult {
    valid: boolean;
    cues: Cue[];
    errors?: any[];
    meta?: Record<string, string> | null;
  }

  interface ParseOptions {
    strict?: boolean;
    meta?: boolean;
  }

  export function parse(input: string, options?: ParseOptions): ParseResult;
  export function compile(input: ParseResult): string;
  
  // Add other exports if needed (e.g., hls, segment)
}   