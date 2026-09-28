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

  it('abstains when nothing matches', async () => {
    const result = await strategy.classify('assunto totalmente aleatorio sem relacao', [
      manutencao,
      ti,
    ]);

    expect(result.sector).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('abstains on ties', async () => {
    const audiovisual = { name: 'Audiovisual', categories: ['projetor'] } as SectorEntity;

    const result = await strategy.classify('o projetor quebrou', [ti, audiovisual]);

    expect(result.sector).toBeNull();
  });
});
