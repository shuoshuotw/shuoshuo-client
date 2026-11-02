export {};

declare global {
  interface Window {
    __motionLog?: { id: string; variant: "full" | "reduced"; phase: "start" | "end" }[];
    __cls?: number;
  }
}
