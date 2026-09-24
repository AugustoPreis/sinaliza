declare module 'js-brasil' {
  export const validateBr: {
    cpf(value: string): boolean;
  };
}

declare namespace Express {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Request {
    cookies: Record<string, string>;
  }
}
