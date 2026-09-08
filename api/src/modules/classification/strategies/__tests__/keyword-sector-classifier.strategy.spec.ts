import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { KeywordSectorClassifierStrategy } from '../keyword-sector-classifier.strategy';

describe('KeywordSectorClassifierStrategy', () => {
  const strategy = new KeywordSectorClassifierStrategy();

  const ti = { name: 'TI', categories: ['projetor', 'computador', 'rede', 'wifi'] } as SectorEntity;
  const manutencao = {
    name: 'Manutenção Predial',
    categories: ['vazamento', 'eletrica', 'porta', 'janela'],
  } as SectorEntity;

  it('picks the sector whose categories overlap the description tokens the most', async () => {
    const result = await strategy.classify('O projetor da sala não está ligando', [ti, manutencao]);

    expect(result.sector).toBe(ti);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('ignores accents and punctuation when tokenizing', async () => {
    const result = await strategy.classify('Há vazamento e problema elétrico no banheiro!', [
      ti,
      manutencao,
    ]);

    expect(result.sector).toBe(manutencao);
  });

  it('falls back to the alphabetically first sector when nothing matches', async () => {
    const result = await strategy.classify('assunto totalmente aleatorio sem relacao', [
      manutencao,
      ti,
    ]);

    expect(result.sector).toBe(manutencao);
    expect(result.confidence).toBe(0);
  });

  it('breaks ties alphabetically by sector name', async () => {
    const audiovisual = { name: 'Audiovisual', categories: ['projetor'] } as SectorEntity;

    const result = await strategy.classify('o projetor quebrou', [ti, audiovisual]);

    expect(result.sector).toBe(audiovisual);
  });
});
