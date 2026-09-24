export type AiRuntimeMode = 'disabled' | 'mock' | 'trained';

/** Default seguro: o modelo MOCK não é ativado implicitamente em produção. */
export function aiRuntimeMode(env: NodeJS.ProcessEnv = process.env): AiRuntimeMode {
  const value = (env.AI_MODE ?? 'disabled').toLowerCase();
  if (value === 'mock' && env.NODE_ENV === 'production') throw new Error('MOCK_MODEL_NOT_ALLOWED: mock proibido em produção.');
  if (value === 'mock' || value === 'trained' || value === 'disabled') return value;
  throw new Error(`AI_MODE inválido: ${value}. Use disabled, mock ou trained.`);
}

export function assertModelDataSourceAllowed(dataSource: unknown, mode = aiRuntimeMode(), env: NodeJS.ProcessEnv = process.env): void {
  if (dataSource !== 'MOCK' && dataSource !== 'REAL') throw new Error('MODEL_SOURCE_INVALID: origem do modelo ausente ou inválida.');
  if (env.NODE_ENV === 'production' && (mode === 'mock' || dataSource === 'MOCK')) throw new Error('MOCK_MODEL_NOT_ALLOWED: mock proibido em produção.');
  if (mode === 'disabled') throw new Error('CLASSIFICATION_DISABLED: a IA está desativada neste ambiente.');
  if (mode === 'mock' && dataSource !== 'MOCK') throw new Error('MODEL_SOURCE_MISMATCH: o ambiente mock exige modelo MOCK.');
  if (mode === 'trained' && dataSource !== 'REAL') throw new Error('MOCK_MODEL_NOT_ALLOWED: modelo MOCK não pode ser usado como produção.');
}
