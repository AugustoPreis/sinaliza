import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { redactSensitiveData, scanPrivacyRisks } from '../src/dataset/privacy.js';
import { prepareRealDataset } from '../src/dataset/real-data.js';

describe('proteção de dados reais', () => {
  const sectors = [
    { id: 'ti-id', name: 'Tecnologia', active: true, examples: ['conta sem acesso', 'sistema indisponível'] },
    { id: 'fin-id', name: 'Finanças', active: true, examples: ['boleto não chegou', 'pagamento pendente'] },
  ];
  it('detecta e remove identificadores comuns sem registrar seus valores', () => {
    const text = 'CPF 123.456.789-00, email aluno@escola.edu.br, RA 12345678 e telefone (48) 99999-1234';
    expect(scanPrivacyRisks(text).map((risk) => risk.type)).toEqual(['email', 'cpf', 'ra', 'telefone']);
    const redacted = redactSensitiveData(text);
    expect(redacted).toContain('[CPF]');
    expect(redacted).toContain('[EMAIL]');
    expect(redacted).toContain('[RA]');
    expect(redacted).toContain('[TELEFONE]');
    expect(redacted).not.toContain('123.456.789-00');
  });

  it('prepara CSV, converte nomes externos em IDs e remove duplicatas', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'academic-ticket-'));
    const input = join(directory, 'entrada.csv');
    const output = join(directory, 'saida.csv');
    await writeFile(input, 'chamado,departamento\n"Email aluno@escola.edu.br sem acesso",Tecnologia\n"Email aluno@escola.edu.br sem acesso",ti-id\n"Boleto não chegou",Finanças\n');
    const report = await prepareRealDataset(input, sectors, output);
    expect(report.inputRows).toBe(3);
    expect(report.outputRows).toBe(2);
    expect(report.removedDuplicates).toBe(1);
    expect(report.distribution['ti-id']).toBe(1);
    expect(await readFile(output, 'utf8')).toContain('[EMAIL]');
  });

  it('recusa setor desconhecido', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'academic-ticket-invalid-'));
    const input = join(directory, 'entrada.csv');
    await writeFile(input, 'texto,setor\n"Quero transporte",Transporte\n');
    await expect(prepareRealDataset(input, sectors, join(directory, 'saida.csv'))).rejects.toThrow('setor não reconhecido');
  });
});
