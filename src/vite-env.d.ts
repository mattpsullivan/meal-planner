/// <reference types="vite/client" />
/// <reference types="wa-sqlite" />

declare module '*.sql?raw' {
  const content: string;
  export default content;
}
