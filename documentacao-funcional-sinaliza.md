# Visão Geral

## O problema

Hoje, quem encontra um problema no campus enfrenta o mesmo obstáculo antes mesmo de o problema ser resolvido: descobrir para quem reportar. A solicitação pode chegar ao lugar errado, ficar parada num e-mail, ou nem chegar a lugar nenhum.

## A proposta

A pessoa relata o problema em linguagem natural, do jeito que descreveria para um colega. O Sinaliza interpreta o relato, identifica o tipo de problema e o setor responsável, e encaminha o chamado, sem que o solicitante precise conhecer a estrutura interna da instituição.

## A hipótese de pesquisa

Além de funcionar como um sistema de chamados, o Sinaliza existe para testar uma hipótese: classificação e encaminhamento automáticos reduzem o erro de encaminhamento e o tempo até o problema chegar à pessoa certa, em comparação com o processo manual atual. Por isso, cada divergência entre a classificação automática e a decisão final (do solicitante ou do setor) é registrada: ela é o dado central da pesquisa, não um efeito colateral.

# Perfis de Usuário

Três perfis, dois produtos: o solicitante usa o aplicativo; o setor e a administração usam o portal web.

## Solicitante: App mobile

Alunos, professores e servidores que encontram um problema no dia a dia do campus.

- Relata problemas com descrição livre, local e foto.
- Confirma ou ajusta o setor sugerido pelo sistema.
- Acompanha o status do chamado até a resolução.

## Responsável de Setor: Portal web

Equipe de TI, manutenção predial, limpeza, segurança e outros setores que atendem chamados.

- Vê a fila de chamados do próprio setor.
- Atualiza status e trata o chamado.
- Reencaminha quando o setor errado recebeu o chamado.

## Administrador Geral: Portal web

Coordenação responsável por manter o sistema e acompanhar a pesquisa.

- Vê todos os chamados, de todos os setores.
- Cadastra setores, categorias e acessos.
- Acompanha os indicadores da pesquisa.

# Fluxo do Chamado

O ponto de decisão mais importante do sistema acontece logo depois da classificação automática: o solicitante pode confirmar o setor sugerido ou trocá-lo. Se trocar, as duas categorias (a automática e a escolhida) ficam registradas para comparação.

1. O solicitante descreve o problema no app (texto + local + foto opcional).
2. O sistema classifica automaticamente o setor responsável com base no texto da descrição; fotos anexadas não entram nessa análise, servem apenas como evidência visual para o setor.
3. O solicitante confirma o setor sugerido ou troca por outro:
   - **Confirma**: o chamado é enviado ao setor sugerido.
   - **Troca**: o chamado é enviado ao setor escolhido; a sugestão automática original fica registrada para comparação.
4. O setor recebe o chamado em sua fila.
5. O setor avalia se o encaminhamento está correto:
   - **Errado**: o setor reclassifica e reencaminha ao setor correto, que passa a receber o chamado em sua própria fila (retorna ao passo 4).
   - **Correto**: o setor atualiza o status do chamado para "Em andamento".
6. O setor marca o chamado como "Resolvido".
7. O solicitante é notificado (push + histórico no app).
8. O dado do chamado, incluindo eventuais divergências de classificação, alimenta os indicadores da pesquisa.

# Ciclo de Vida do Chamado

Todo chamado passa pelos status abaixo, nesta ordem. A reclassificação não é um status onde o chamado "descansa": é um evento registrado na linha do tempo, que muda o setor responsável e reinicia a fila de atendimento.

- **Aberto**: chamado criado e classificado automaticamente. Ainda não foi visto pelo setor.
- **Encaminhado**: setor responsável definido (automático ou escolhido pelo solicitante). Aguardando o setor tratar.
- **Em andamento**: o setor confirmou o recebimento e está tratando o problema.
- **Reclassificado** _(evento, não um status de repouso)_: o setor identificou um encaminhamento errado e moveu o chamado para outro setor.
- **Resolvido**: problema tratado. Solicitante notificado.

\newpage

# Aplicativo do Solicitante

Login obrigatório com conta institucional, necessário para notificar o andamento do chamado e para os dados da pesquisa. Oito telas cobrem o fluxo completo, do relato à resolução.

## Tela A.1: Login institucional

_Ponto de entrada do app. Só quem tem vínculo com a instituição consegue abrir um chamado. Não existe autocadastro: a conta já precisa existir no sistema, criada pela administração a partir da importação de planilha (Tela C.3)._

**Campos**

- **Usuário institucional** _(matrícula ou e-mail · obrigatório)_: identifica o vínculo (aluno, professor, servidor). Precisa já constar na base importada pela administração.
- **Senha** _(texto oculto · obrigatório)_: autenticação institucional (mesma conta usada em outros sistemas da universidade).
- **Esqueci minha senha** _(ação)_: encaminha para o fluxo de recuperação da conta institucional.

## Tela A.2: Meus chamados

_Tela inicial após o login. Lista os chamados abertos pelo próprio usuário._

**Elementos**

- **Filtro (abas)**: Todos / Abertos / Resolvidos.
- **Item da lista**: descrição resumida, nº de protocolo, setor atual e status em destaque.
- **Toque no item**: abre a Tela A.6 (Detalhe do chamado).
- **Botão "Novo relato"**: abre a Tela A.3.

## Tela A.3: Novo relato

_O solicitante descreve o problema com suas próprias palavras. Não existe formulário com categorias pré-definidas nesta etapa: a classificação acontece depois, automaticamente._

**Campos**

- **Descrição do problema** _(texto livre · obrigatório)_: relato em linguagem natural. É o texto que a classificação automática interpreta.
- **Local** _(seleção guiada: prédio → ambiente · obrigatório)_: ajuda tanto na triagem quanto na localização física de quem for atender.
- **Fotos** _(anexo de imagem, múltiplo · opcional)_: evidência visual do problema, visível ao setor responsável. Não é usada pela classificação automática, que analisa apenas o texto da descrição.
- **Continuar** _(ação)_: dispara a classificação automática e abre a Tela A.4.

## Tela A.4: Confirmação do setor

_O sistema mostra o setor identificado automaticamente. O solicitante pode enviar como está ou trocar por outro setor da lista antes de enviar._

**Campos**

- **Sugestão automática** _(somente leitura)_: setor identificado pela classificação automática, exibido para transparência.
- **Enviar para** _(lista de setores, editável · obrigatório)_: pré-preenchido com a sugestão. Se o solicitante escolher outro setor, o sistema registra a categoria automática original **e** a categoria final escolhida.
- **Enviar chamado** _(ação)_: cria o chamado e abre a Tela A.5.

## Tela A.5: Chamado enviado

_Confirmação simples com o número de protocolo, para referência do solicitante._

**Elementos**

- **Nº de protocolo**: identificador único do chamado, usado em qualquer contato posterior.
- **Setor de destino**: nome do setor para o qual o chamado foi de fato encaminhado.
- **Ver chamado**: abre a Tela A.6.

## Tela A.6: Detalhe do chamado

_Acompanhamento completo de um chamado específico, incluindo a linha do tempo de status e qualquer reencaminhamento feito pelo setor._

**Elementos**

- **Dados do chamado**: descrição, local e fotos enviadas na abertura.
- **Setor responsável atual**: sempre reflete o setor mais recente, mesmo após reencaminhamento.
- **Linha do tempo**: todos os eventos com data e hora, incluindo abertura, encaminhamento, mudanças de status e reencaminhamentos (ex.: "Redirecionado para TI").

## Tela A.7: Notificações

_Histórico de avisos push recebidos, cada um levando de volta ao chamado relacionado._

**Elementos**

- **Item de notificação**: uma linha por mudança de status recebida via push.
- **Toque no item**: abre a Tela A.6 do chamado correspondente.

## Tela A.8: Perfil

_Dados da conta institucional vinculada ao app._

**Elementos**

- **Nome, vínculo, e-mail**: dados vindos da conta institucional, não editáveis pelo app.
- **Sair**: encerra a sessão no dispositivo.

\newpage

# Portal do Setor

Cada setor (TI, manutenção predial, limpeza, segurança...) enxerga apenas a própria fila. É aqui que um encaminhamento automático incorreto é corrigido, quando o setor identifica que recebeu um chamado que não é seu.

## Tela B.1: Login institucional (equipe)

_Mesma conta institucional, agora associada a um papel de setor._

**Campos**

- **E-mail institucional** _(obrigatório)_: precisa constar na base importada e estar associado a um setor pelo administrador (Tela C.4).
- **Senha** _(texto oculto · obrigatório)_: autenticação institucional.

## Tela B.2: Fila do setor

_Tela inicial do papel Setor. Lista os chamados encaminhados para aquele setor específico, ordenados para priorizar os mais antigos._

**Elementos**

- **Filtros**: status, período e local/prédio.
- **Coluna Categoria**: indica se a categoria automática e a confirmada pelo solicitante coincidem ou divergem; divergências ficam destacadas.
- **Ordenação**: padrão, mais antigos primeiro, para priorizar chamados parados há mais tempo.
- **Clique na linha**: abre a Tela B.3.

## Tela B.3: Detalhe do chamado (setor)

_Onde o setor trata o chamado: atualiza o status ou, se identificar que o encaminhamento está errado, reclassifica para o setor correto._

**Campos**

- **Categoria automática vs. confirmada** _(somente leitura)_: exibida em destaque quando divergem, para o setor entender o histórico de classificação.
- **Status** _(seleção: Em andamento / Resolvido · obrigatório)_: atualiza o ciclo de vida do chamado.
- **Reencaminhar para outro setor** _(lista de setores · opcional)_: move o chamado para a fila de outro setor; volta ao status Encaminhado lá.
- **Motivo do reencaminhamento** _(texto livre · obrigatório se reencaminhar)_: registrado na linha do tempo do solicitante e usado nos indicadores da pesquisa.
- **Observação interna** _(texto livre · opcional)_: nota de atendimento visível apenas para setor/administração, não para o solicitante.

## Tela B.4: Resolvidos

_Histórico consultável dos chamados já resolvidos pelo setor._

**Elementos**

- **Buscar**: por protocolo, local ou palavra da descrição.
- **Item da lista**: abre o mesmo Detalhe do chamado (Tela B.3), em modo somente leitura.

\newpage

# Portal da Administração

Visão de coordenação: todos os setores, todos os chamados, e a manutenção do cadastro que faz a classificação automática funcionar, incluindo setores, categorias e quem tem acesso a cada um.

## Tela C.1: Painel geral

_Tela inicial do papel Administrador. Todos os chamados da instituição, com indicadores resumidos no topo._

**Elementos**

- **Filtros**: setor, status, período e local.
- **Indicadores resumidos**: volume no período, % resolvidos, tempo médio até o setor correto.
- **Tabela por setor**: visão consolidada de fila e atendimento em andamento por setor.

## Tela C.2: Setores e categorias

_Cadastro que sustenta a classificação automática: quais categorias de problema existem e para qual setor cada uma aponta._

**Campos**

- **Nome do setor** _(texto · obrigatório)_: nome exibido para o solicitante e nas filas.
- **Categorias associadas** _(lista de tags · obrigatório)_: tipos de problema que a classificação automática deve direcionar a este setor.
- **Responsáveis vinculados** _(lista de usuários · opcional)_: quem tem acesso à fila deste setor (gerenciado na Tela C.4).

## Tela C.3: Importar usuários

_Os usuários (solicitantes, equipe de setor e administradores) não se autocadastram: o acesso é criado em lote a partir de uma planilha que a própria instituição disponibiliza. A instituição deve seguir exatamente o modelo fornecido pelo sistema: qualquer divergência de colunas ou formato faz a importação inteira falhar, sem criar cadastros parciais._

**Campos**

- **Baixar modelo** _(ação)_: gera a planilha-modelo com as colunas exigidas (nome, e-mail institucional, vínculo e, quando aplicável, setor/papel).
- **Planilha de usuários** _(upload de arquivo · obrigatório)_: arquivo preenchido pela instituição a partir do modelo baixado.
- **Importar** _(ação)_: valida o arquivo contra o modelo antes de processar. Se o formato não corresponder exatamente (colunas ausentes, fora de ordem ou com nome diferente), a importação é rejeitada por inteiro e nenhum usuário é criado ou atualizado.
- **Resultado da importação** _(somente leitura)_: em caso de sucesso, quantidade de contas criadas e atualizadas; em caso de erro, indica especificamente o que diverge do modelo.

## Tela C.4: Usuários e permissões

_Consulta as contas trazidas pela importação (Tela C.3) e permite ajustar individualmente o papel de uma pessoa (setor específico ou administrador) ou revogar seu acesso, sem precisar de uma nova importação para isso._

**Campos**

- **E-mail institucional** _(somente leitura)_: identifica a pessoa; vem da planilha importada.
- **Papel** _(um ou mais setores, ou Administrador · obrigatório)_: define o que a pessoa enxerga ao entrar no portal. Ajustável individualmente após a importação.
- **Revogar acesso** _(ação)_: remove o acesso sem apagar o histórico de atendimentos já feitos pela pessoa.

## Tela C.5: Indicadores da pesquisa

_Onde a hipótese da pesquisa é acompanhada ao longo do piloto. Detalhado na próxima seção._

**Elementos**

- **Taxa de acerto automático**: % de chamados em que a classificação automática não precisou de nenhuma correção.
- **Corrigido pelo solicitante / setor**: separa em qual etapa a correção aconteceu.
- **Exportar dados** _(ação)_: gera uma planilha para análise externa da pesquisa.

\newpage

# Indicadores da Pesquisa

Estes indicadores existem para responder à pergunta de pesquisa do projeto: a classificação e o encaminhamento automáticos reduzem erro e tempo, em comparação com o processo manual?

- **Taxa de acerto da classificação automática**: proporção de chamados em que o setor sugerido automaticamente é o mesmo que resolveu o chamado, sem correção do solicitante nem reencaminhamento do setor.
- **Correção pelo solicitante vs. pelo setor**: quando há divergência, distingue se ela foi pega ainda na Tela A.4 (antes de enviar) ou só depois, quando o setor errado já tinha recebido o chamado (Tela B.3). A segunda é mais cara: envolve tempo perdido e um reencaminhamento.
- **Tempo até o setor correto**: da abertura do chamado até ele estar na fila do setor que efetivamente o resolveu, incluindo o tempo de qualquer reencaminhamento no meio do caminho.
- **Volume por setor, categoria e local**: base para identificar padrões, como categorias com mais divergência, setores mais sobrecarregados e locais com mais ocorrências recorrentes.

# Fora do Escopo desta Versão

Pontos considerados e deliberadamente deixados de fora desta primeira versão, para não expandir o piloto antes de validar o núcleo do sistema.

- **Reabertura**: o solicitante ainda não tem uma ação de "isso não foi resolvido"; se necessário, hoje precisaria abrir um novo relato.
- **Prioridade**: não há nível de urgência/SLA por criticidade; todo chamado segue a mesma fila, ordenada por tempo em aberto. É um campo considerado útil e esperado numa versão final de produção, mas deliberadamente fora deste MVP.
- **Outros canais**: relato só pelo app; um canal conversacional adicional (ex.: WhatsApp) pode ser avaliado depois do piloto.
- **Idioma**: documentação e telas em português apenas, alinhado ao contexto do piloto.

\newpage

# Glossário

- **Protocolo**: identificador único de um chamado (ex.: #SIN-1042), usado para referência em qualquer tela ou contato.
- **Setor**: equipe responsável por atender um tipo de problema (Manutenção Predial, TI, Limpeza, Segurança...).
- **Categoria automática**: setor identificado pelo sistema a partir do texto do relato (fotos anexadas não são analisadas), antes de qualquer intervenção humana.
- **Categoria confirmada**: setor que efetivamente recebeu o chamado após a Tela A.4, igual à automática quando o solicitante não troca.
- **Reclassificação**: correção feita pelo setor (Tela B.3) quando um chamado chega a quem não deveria atendê-lo.
- **Divergência**: qualquer caso em que a categoria automática difere da confirmada pelo solicitante ou da definida após reclassificação; o dado central medido pela pesquisa.
