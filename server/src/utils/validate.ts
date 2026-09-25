type Rules = Record<string, (value: unknown) => string | null>;

export function validateBody(rules: Rules) {
  return (body: Record<string, unknown>) => {
    const errors: Record<string, string> = {};
    for (const [field, rule] of Object.entries(rules)) {
      const message = rule(body[field]);
      if (message) errors[field] = message;
    }
    return errors;
  };
}

export const isString = (min = 1, max = 500) => (value: unknown) => {
  if (typeof value !== "string") return "Must be a string";
  const trimmed = value.trim();
  if (trimmed.length < min) return `Must be at least ${min} character(s)`;
  if (trimmed.length > max) return `Must be at most ${max} characters`;
  return null;
};

export const optionalString = (max = 500) => (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  return isString(1, max)(value);
};

export const isEmail = (value: unknown) => {
  if (typeof value !== "string") return "Must be a string";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Must be a valid email";
  return null;
};

export const isEnum = (values: string[]) => (value: unknown) => {
  if (typeof value !== "string" || !values.includes(value)) {
    return `Must be one of: ${values.join(", ")}`;
  }
  return null;
};

export const optionalEnum = (values: string[]) => (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  return isEnum(values)(value);
};

export const isDate = (value: unknown) => {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return "Must be a valid ISO date";
  return null;
};

export const optionalDate = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  return isDate(value);
};

export const optionalId = (value: unknown) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "Must be a string id";
  return null;
};
