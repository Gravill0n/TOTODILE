// Schema source of truth (PRD §20.2): app validation, the validate-guides CI
// gate, and the compiler skills all import from here. Types come from these
// schemas via z.infer — never hand-written duplicates (§22.1).
export * from "./approvals";
export * from "./common";
export * from "./deck";
export * from "./guide";
export * from "./library";
export * from "./raMapping";
export * from "./sources";
export * from "./spine";
export * from "./widgets";
