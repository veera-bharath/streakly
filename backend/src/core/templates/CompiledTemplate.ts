export type CompiledTemplate = {
  subject: (data: Record<string, unknown>) => string;
  html:    (data: Record<string, unknown>) => string;
  text?:   (data: Record<string, unknown>) => string;
};
