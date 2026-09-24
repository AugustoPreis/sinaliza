/**
 * Vocabulário português compacto para a correção online.
 *
 * O dictionary-pt completo continua disponível para validações offline, mas
 * possui mais de 300 mil entradas e torna a inicialização do nspell muito
 * custosa. Esta lista cobre o domínio e as formas comuns do dataset inicial.
 */
export const COMPACT_PORTUGUESE_WORDS = `
abrir acesso acessar acadêmico acadêmica acadêmicos adicionaram agora ainda aluno alunos bloqueado
alterar ambiente anterior aparece aplicativo aproveitamento arquivo artigos atendimento
atrasada atrasadas aula aulas autenticador base biblioteca boleto bloqueada bolsa cadeira
campus cancelar cadastro carrega cartão celular certidão cobrança código compensado
comprovante conclusão consigo conexão configurar consta consultar conta corrigir curso
dados data débito declaração devolver devolução digital diploma disciplina disciplinas
dívida documentos doar duplicada e-mail empréstimo entrar enviar erro escolar esqueci
estorno faculdade fazer fez ficha financiamento funciona gabinete gostaria grade histórico
hoje horário incluir indisponível instituição institucional internet juros laboratório
lenta livro livros localizar login matéria matrícula mensalidade mensalidades mensagens
meu minha mudar nome notebook nota obras online pagamento pagas parcelas pedir pendências
perdeu perdi periódicos pix pontualidade portal prazo preciso prorrogar quitar quitação
receber recibos redefinir renegociação renovar reserva reservar retirar segunda semestre
senha situação solicitar suspenso sistema sistemas taxa tela tese transferir trocar turno
última atualizar valor vencida vencido vencimento via virtual wifi
acervo acesso bloqueada acessar portal empréstimo acadêmico histórico projetor computador energia tomada lâmpada
`.trim().split(/\s+/u);

// A correção automática só aceita destinos importantes no domínio. Palavras
// fora desta lista continuam intactas e podem ser tratadas pelos char n-grams.
export const SAFE_CORRECTION_TARGETS = new Set([
  'acesso', 'acessar', 'acadêmico', 'acadêmica', 'biblioteca', 'bloqueada',
  'boleto', 'empréstimo', 'financeiro', 'histórico', 'matrícula', 'mensalidade',
  'portal', 'rematrícula', 'secretaria', 'senha', 'sistema',
  'projetor', 'computador', 'energia', 'tomada', 'lâmpada',
]);

export const COMPACT_AFFIX = `SET UTF-8
TRY aeioustrmncldpbvgfhqzjxkwyçáéíóúâêôãõ
`;

export function compactDictionary(): { aff: string; dic: string } {
  const words = [...new Set(COMPACT_PORTUGUESE_WORDS)];
  return { aff: COMPACT_AFFIX, dic: `${words.length}\n${words.join('\n')}` };
}
