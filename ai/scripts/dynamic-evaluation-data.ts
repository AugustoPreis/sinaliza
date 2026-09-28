import type { Candidate } from '../src/classification/dynamic.js';

const candidate = (index: number, name: string, categories: string[]): Candidate => ({
  id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  name,
  categories,
});

export const institutionalCandidates = [
  candidate(1, 'Suporte tecnológico', ['computador', 'projetor', 'rede', 'senha', 'software']),
  candidate(2, 'Serviços financeiros', ['mensalidade', 'boleto', 'pagamento', 'cobrança']),
  candidate(3, 'Acervo e empréstimos', ['livros', 'renovação de empréstimo', 'biblioteca']),
  candidate(4, 'Registros acadêmicos', ['matrícula', 'histórico escolar', 'diploma', 'declaração']),
  candidate(5, 'Conservação predial', ['tomada', 'energia elétrica', 'vazamento', 'ar condicionado']),
  candidate(6, 'Gestão de pessoas', ['férias de funcionário', 'folha de pagamento', 'contratação', 'contracheque']),
];

export const sparseCandidates = [
  candidate(7, 'Homologação local - Recursos Humanos', ['férias de funcionários', 'folha de pagamento', 'contracheque']),
  candidate(8, 'Homologação local - Astronomia Quântica', ['interferometria quântica', 'fótons emaranhados', 'óptica quântica astronômica']),
];

export interface EvaluationCase {
  description: string;
  candidates: Candidate[];
  expected: string | null;
  scenario: 'class-present' | 'class-missing' | 'out-of-domain';
}

const present = (description: string, index: number): EvaluationCase => ({
  description, candidates: institutionalCandidates, expected: institutionalCandidates[index]!.id, scenario: 'class-present',
});
const missing = (description: string, index: number): EvaluationCase => ({
  description, candidates: institutionalCandidates.filter((_, candidateIndex) => candidateIndex !== index), expected: null, scenario: 'class-missing',
});
const sparsePresent = (description: string, index: number): EvaluationCase => ({
  description, candidates: sparseCandidates, expected: sparseCandidates[index]!.id, scenario: 'class-present',
});
const sparseMissing = (description: string): EvaluationCase => ({
  description, candidates: sparseCandidates, expected: null, scenario: 'class-missing',
});

export const calibrationCases: EvaluationCase[] = [
  present('O projetor não exibe a imagem do computador pelo HDMI', 0),
  present('Esqueci minha senha de acesso e preciso redefinir', 0),
  present('Paguei o boleto mas a mensalidade continua atrasada', 1),
  present('Minha cobrança veio em duplicidade neste mês', 1),
  present('Quero renovar o empréstimo dos livros que peguei', 2),
  present('O catálogo não mostra o livro que preciso reservar', 2),
  present('Preciso emitir meu histórico escolar atualizado', 3),
  present('A declaração de matrícula veio com meu nome errado', 3),
  present('A tomada da sala queimou e está sem energia elétrica', 4),
  present('Há vazamento de água no teto do corredor', 4),
  present('Sou funcionário e preciso solicitar minhas férias', 5),
  present('Meu contracheque veio com erro na folha de pagamento', 5),
  missing('O computador do laboratório não liga e preciso de suporte', 0),
  missing('Meu boleto da mensalidade venceu e preciso emitir a segunda via', 1),
  missing('Preciso renovar o empréstimo de um livro da biblioteca', 2),
  missing('Preciso corrigir minha matrícula e emitir o histórico escolar', 3),
  sparsePresent('Preciso conferir meu contracheque e a folha de pagamento', 0),
  sparsePresent('Preciso analisar interferometria quântica e fótons emaranhados', 1),
  sparseMissing('Meu boleto da mensalidade venceu e preciso emitir a segunda via'),
  sparseMissing('O computador do laboratório não liga e preciso de suporte'),
  sparseMissing('Preciso corrigir minha matrícula e emitir o histórico escolar'),
  sparseMissing('Preciso renovar o empréstimo de um livro da biblioteca'),
  { description: 'Quero saber qual a melhor receita de bolo', candidates: institutionalCandidates, expected: null, scenario: 'out-of-domain' },
  { description: 'Quem ganhou a partida de futebol ontem à noite', candidates: institutionalCandidates, expected: null, scenario: 'out-of-domain' },
];

export const holdoutCases: EvaluationCase[] = [
  present('Meu projetor não mostra a tela do notebook mesmo com o cabo conectado', 0),
  present('Fiz o pix da mensalidade ontem mas ainda consta uma dívida no portal', 1),
  present('Devolvi os livros antes do prazo mas meu empréstimo continua aberto', 2),
  present('Meu sobrenome está errado na declaração que preciso entregar no estágio', 3),
  present('O ar condicionado está pingando água e molhando as mesas da sala', 4),
  present('Como funcionário quero conferir o saldo de dias de férias', 5),
  missing('A rede wifi caiu e nenhum computador consegue acessar a internet', 0),
  missing('O desconto da bolsa não apareceu no boleto deste mês', 1),
  missing('Quero reservar uma obra que está emprestada na biblioteca', 2),
  missing('Quero solicitar o trancamento da minha disciplina', 3),
  sparsePresent('Como funcionário quero solicitar minhas férias', 0),
  sparsePresent('O observatório pesquisa óptica quântica astronômica', 1),
  sparseMissing('Paguei a mensalidade mas a cobrança continua em aberto'),
  sparseMissing('Minha senha do portal acadêmico está bloqueada'),
  sparseMissing('Minha declaração de matrícula veio com o nome errado'),
  sparseMissing('Quero reservar uma obra no acervo'),
  { description: 'Preciso regularizar um problema que apareceu ontem', candidates: institutionalCandidates, expected: null, scenario: 'out-of-domain' },
  { description: 'Qual é o planeta mais distante do sol', candidates: institutionalCandidates, expected: null, scenario: 'out-of-domain' },
];
