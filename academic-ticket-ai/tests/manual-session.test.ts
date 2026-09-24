import { expect, it } from 'vitest';
import { ManualSession, resolveManualSector } from '../src/classification/manual-session.js';
it('conta acertos, erros e pendências sem transformar falta de avaliação em acerto', () => {
  const session = new ManualSession();
  expect(session.summary().accuracy).toBeNull();
  expect(() => session.markExpected('TI')).toThrow();
  session.addPrediction('TI'); session.markExpected('TI');
  session.addPrediction('Financeiro', true); session.markExpected('Biblioteca');
  session.addPrediction('Infraestrutura', true);
  expect(session.summary()).toEqual({ total: 3, evaluated: 2, correct: 1, incorrect: 1, pending: 1, requiresReview: 2, accuracy: 0.5 });
});
it('permite corrigir uma avaliação sem contar o mesmo chamado duas vezes', () => {
  const session = new ManualSession();
  session.addPrediction('TI'); session.markExpected('TI'); session.markExpected('TI');
  session.markExpected('Infraestrutura');
  expect(session.summary()).toMatchObject({ evaluated: 1, correct: 0, incorrect: 1, accuracy: 0 });
});
it('resolve setor pelo número ou nome sem acentos e rejeita categorias inexistentes', () => {
  const sectors = ['TI', 'Secretaria Acadêmica', 'Infraestrutura'];
  expect(resolveManualSector('2', sectors)).toBe('Secretaria Acadêmica');
  expect(resolveManualSector('secretaria academica', sectors)).toBe('Secretaria Acadêmica');
  expect(() => resolveManualSector('0', sectors)).toThrow();
  expect(() => resolveManualSector('999', sectors)).toThrow();
});
