// `LoginResponse` is emitted by both orval outputs: as a Zod schema in
// `generated/api` and as a TypeScript interface in `generated/types`. Two
// star exports of the same name are ambiguous (TS2308), so re-export the
// schema explicitly — that is the meaning consumers use.
export * from "./generated/api";
export * from "./generated/types";
export { LoginResponse } from "./generated/api";
