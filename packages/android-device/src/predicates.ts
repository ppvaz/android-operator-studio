export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
/** A string with something in it. Only the true branch narrows soundly: a blank string is a string too. */
export const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
/** A list, whose items are still to be checked (Array.isArray would call them `any`). */
export const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);
export const isOneOf = <T>(values: readonly T[], value: unknown): value is T => {
  const choices: readonly unknown[] = values;
  return choices.includes(value);
};
