# Sinaliza - Especificação de API sugerida

> Documento técnico derivado da **Documentação Funcional do Sinaliza - 20 de agosto de 2026**.
>
> A documentação original descreve telas, perfis e regras de negócio, mas **não define endpoints HTTP**. Portanto, os nomes das rotas, métodos HTTP e formatos JSON abaixo são uma **proposta de implementação** para cobrir o comportamento especificado, sem adicionar funcionalidades de produto fora do escopo.

---

## 1. Convenções sugeridas

### Base URL

```text
/api/v1
```

### Autenticação

Usar token de sessão/JWT após login institucional.

```http
Authorization: Bearer <token>
```

A forma exata de validar a senha institucional não é definida na documentação funcional. A API abaixo assume que existe uma integração com o mecanismo de autenticação da instituição.

### Perfis de acesso

```text
REQUESTER   = solicitante
SECTOR      = responsável/equipe de setor
ADMIN       = administrador geral
```

Um usuário de portal pode ter acesso a um ou mais setores ou possuir papel de administrador.

### Status do chamado

```text
OPEN        = Aberto
FORWARDED   = Encaminhado
IN_PROGRESS = Em andamento
RESOLVED    = Resolvido
```

`RECLASSIFIED` **não deve ser salvo como status de repouso**. Reclassificação é um evento da linha do tempo. Após uma reclassificação, o chamado volta para `FORWARDED` no novo setor.

### Dados importantes para a pesquisa

Para cada chamado, preservar pelo menos:

```text
automatic_sector_id       setor sugerido automaticamente
confirmed_sector_id       setor escolhido/confirmado pelo solicitante
current_sector_id         setor responsável atualmente
resolved_by_sector_id     setor que efetivamente resolveu o chamado
requester_corrected       se o solicitante alterou a sugestão automática
sector_reclassified       se algum setor reencaminhou o chamado
created_at                data/hora de abertura
correct_sector_reached_at momento em que entrou na fila do setor que o resolveu
resolved_at               data/hora de resolução
```

Esses dados são necessários para os indicadores definidos na documentação.

---

# 2. Resumo dos endpoints

| Método | Endpoint | Perfil | Finalidade |
|---|---|---|---|
| POST | `/auth/login` | Todos | Autenticar conta institucional |
| POST | `/auth/logout` | Todos | Encerrar sessão |
| POST | `/auth/forgot-password` | Todos | Iniciar/obter fluxo de recuperação institucional |
| GET | `/me` | Todos | Retornar usuário autenticado e permissões |
| POST | `/devices/push-token` | Solicitante | Registrar dispositivo para push |
| DELETE | `/devices/push-token` | Solicitante | Remover dispositivo do push |
| GET | `/locations` | Solicitante/Portal | Listar prédios e ambientes |
| GET | `/sectors` | Autenticado | Listar setores disponíveis |
| POST | `/classification/preview` | Solicitante | Classificar descrição antes de criar chamado |
| POST | `/tickets` | Solicitante | Criar e encaminhar chamado |
| GET | `/tickets` | Solicitante | Listar próprios chamados |
| GET | `/tickets/{ticketId}` | Autorizado | Consultar detalhe e linha do tempo |
| GET | `/notifications` | Solicitante | Listar histórico de notificações |
| GET | `/sector/tickets` | Setor | Listar fila/histórico do setor |
| PATCH | `/tickets/{ticketId}/status` | Setor/Admin | Alterar status para Em andamento ou Resolvido |
| POST | `/tickets/{ticketId}/reassign` | Setor/Admin | Reclassificar e reencaminhar chamado |
| PATCH | `/tickets/{ticketId}/internal-note` | Setor/Admin | Salvar observação interna |
| GET | `/admin/tickets` | Admin | Consultar todos os chamados |
| GET | `/admin/dashboard` | Admin | Obter painel geral e indicadores operacionais |
| GET | `/admin/sectors` | Admin | Listar setores e categorias |
| POST | `/admin/sectors` | Admin | Criar setor |
| PATCH | `/admin/sectors/{sectorId}` | Admin | Editar setor/categorias/responsáveis |
| GET | `/admin/users/import-template` | Admin | Baixar planilha-modelo |
| POST | `/admin/users/import` | Admin | Validar e importar usuários em lote |
| GET | `/admin/users` | Admin | Consultar usuários importados |
| PATCH | `/admin/users/{userId}/permissions` | Admin | Alterar papel/setores de um usuário |
| POST | `/admin/users/{userId}/revoke` | Admin | Revogar acesso sem apagar histórico |
| POST | `/admin/users/{userId}/restore` | Admin | Restaurar acesso revogado |
| GET | `/admin/research/indicators` | Admin | Consultar indicadores da pesquisa |
| GET | `/admin/research/export` | Admin | Exportar dados da pesquisa |

---

# 3. Autenticação e sessão

## 3.1 `POST /auth/login`

### O que recebe

```json
{
  "identifier": "usuario@instituicao.edu.br",
  "password": "senha"
}
```

`identifier` pode representar matrícula ou e-mail no app do solicitante. No portal, a interface usa e-mail institucional.

### O que retorna

```json
{
  "access_token": "jwt-ou-token-de-sessao",
  "expires_in": 3600,
  "user": {
    "id": "usr_123",
    "name": "Maria Silva",
    "email": "maria@instituicao.edu.br",
    "institutional_link": "ALUNO",
    "roles": ["REQUESTER"],
    "sector_ids": []
  }
}
```

### O que faz

- Valida a conta institucional.
- Verifica se a conta existe na base previamente importada pela administração.
- Verifica se o acesso não está revogado.
- Cria a sessão/token.
- Retorna os papéis e setores aos quais o usuário possui acesso.

### Regras

- Não existe autocadastro.
- Contas devem existir na base importada.
- Usuário revogado não pode autenticar no sistema.

---

## 3.2 `POST /auth/logout`

### O que recebe

Nenhum body obrigatório.

```json
{}
```

### O que retorna

```json
{
  "success": true
}
```

### O que faz

- Encerra/invalida a sessão atual.

---

## 3.3 `POST /auth/forgot-password`

### O que recebe

```json
{
  "identifier": "usuario@instituicao.edu.br"
}
```

### O que retorna

Exemplo caso a instituição possua URL própria de recuperação:

```json
{
  "recovery_url": "https://contas.instituicao.edu.br/recuperar-senha"
}
```

### O que faz

- Encaminha o usuário para o fluxo institucional de recuperação de senha.

### Observação

A documentação funcional diz apenas que “Esqueci minha senha” encaminha para o fluxo da conta institucional. Ela não define se a recuperação será feita pela API do Sinaliza ou externamente.

---

## 3.4 `GET /me`

### O que recebe

Somente autenticação.

### O que retorna

```json
{
  "id": "usr_123",
  "name": "Maria Silva",
  "email": "maria@instituicao.edu.br",
  "institutional_link": "ALUNO",
  "roles": ["REQUESTER"],
  "sector_ids": [],
  "access_revoked": false
}
```

### O que faz

- Retorna os dados da conta institucional exibidos no perfil.
- Informa ao front-end quais telas e filas o usuário pode acessar.

---

# 4. Push notifications

> Estes endpoints são uma **necessidade técnica inferida** da exigência de notificação push. A documentação não especifica como o token do dispositivo será armazenado.

## 4.1 `POST /devices/push-token`

### O que recebe

```json
{
  "token": "token-fcm-ou-apns",
  "platform": "ANDROID"
}
```

### O que retorna

```json
{
  "success": true
}
```

### O que faz

- Associa o token de push do dispositivo ao usuário autenticado.
- Permite notificar o solicitante sobre mudanças do chamado.

---

## 4.2 `DELETE /devices/push-token`

### O que recebe

```json
{
  "token": "token-fcm-ou-apns"
}
```

### O que retorna

```json
{
  "success": true
}
```

### O que faz

- Remove/desassocia o token de push, por exemplo no logout.

---

# 5. Localização

> A Tela A.3 exige seleção guiada `prédio → ambiente`. A documentação não define uma tela administrativa para manter esses locais, portanto a origem desse cadastro precisa ser definida na implementação.

## 5.1 `GET /locations`

### O que recebe

Filtros opcionais:

```text
?building_id=bld_01
```

### O que retorna

Uma forma simples é retornar a estrutura hierárquica completa:

```json
{
  "buildings": [
    {
      "id": "bld_01",
      "name": "Bloco A",
      "environments": [
        {
          "id": "env_101",
          "name": "Sala 101"
        },
        {
          "id": "env_corridor_1",
          "name": "Corredor térreo"
        }
      ]
    }
  ]
}
```

### O que faz

- Alimenta a seleção guiada de local no app.
- Alimenta filtros de local/prédio no portal.

---

# 6. Setores

## 6.1 `GET /sectors`

### O que recebe

Opcionalmente:

```text
?active=true
```

### O que retorna

```json
{
  "items": [
    {
      "id": "sec_ti",
      "name": "TI"
    },
    {
      "id": "sec_manutencao",
      "name": "Manutenção Predial"
    }
  ]
}
```

### O que faz

- Fornece a lista usada na Tela A.4 para o solicitante alterar o setor sugerido.
- Fornece a lista usada na Tela B.3 para reencaminhar chamados.

---

# 7. Classificação automática

## 7.1 `POST /classification/preview`

### O que recebe

```json
{
  "description": "O projetor da sala não está ligando"
}
```

### O que retorna

```json
{
  "automatic_sector": {
    "id": "sec_ti",
    "name": "TI"
  }
}
```

Opcionalmente, se a implementação do classificador produzir confiança:

```json
{
  "automatic_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "confidence": 0.91
}
```

### O que faz

- Recebe a descrição em linguagem natural.
- Classifica automaticamente qual setor deve receber o chamado.
- Retorna a sugestão para exibição na Tela A.4.
- **Não cria o chamado ainda.**

### Regra crítica

A classificação deve usar **somente o texto da descrição**.

Não usar:

- fotos;
- conteúdo visual dos anexos.

A documentação diz explicitamente que as fotos servem apenas como evidência visual para o setor.

---

# 8. Chamados - solicitante

## 8.1 `POST /tickets`

### O que recebe

Sugestão: `multipart/form-data`, pois o chamado pode conter múltiplas fotos.

Parte JSON:

```json
{
  "description": "O projetor da sala não está ligando",
  "location": {
    "building_id": "bld_01",
    "environment_id": "env_101"
  },
  "automatic_sector_id": "sec_ti",
  "confirmed_sector_id": "sec_ti"
}
```

Arquivos opcionais:

```text
photos[] = imagem1.jpg
photos[] = imagem2.jpg
```

Exemplo quando o solicitante corrige a IA:

```json
{
  "description": "Há água vazando do teto",
  "location": {
    "building_id": "bld_01",
    "environment_id": "env_101"
  },
  "automatic_sector_id": "sec_limpeza",
  "confirmed_sector_id": "sec_manutencao"
}
```

### O que retorna

```json
{
  "id": "tkt_123",
  "protocol": "SIN-1042",
  "status": "FORWARDED",
  "automatic_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "confirmed_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "current_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "requester_corrected": false,
  "created_at": "2026-08-20T14:30:00Z"
}
```

### O que faz

- Cria o chamado.
- Gera um protocolo único.
- Registra a categoria/setor automático original.
- Registra o setor confirmado/escolhido pelo solicitante.
- Registra se houve divergência na Tela A.4.
- Salva local e fotos.
- Encaminha o chamado para a fila do setor confirmado.
- Cria os eventos iniciais da linha do tempo.

### Eventos iniciais sugeridos

```text
TICKET_OPENED
AUTO_CLASSIFIED
REQUESTER_CONFIRMED_SECTOR
```

ou, se houve troca:

```text
TICKET_OPENED
AUTO_CLASSIFIED
REQUESTER_CHANGED_SECTOR
```

### Regra importante

O chamado deve ficar em `FORWARDED` após o setor final da Tela A.4 ser definido.

Embora a documentação descreva `OPEN` como o momento de criação/classificação, esse estado é transitório no fluxo de criação antes do encaminhamento final.

---

## 8.2 `GET /tickets`

### O que recebe

Filtros opcionais:

```text
?status=OPEN,FORWARDED,IN_PROGRESS
?resolved=false
?page=1
?page_size=20
```

O backend deve limitar os resultados aos chamados do **solicitante autenticado**.

### O que retorna

```json
{
  "items": [
    {
      "id": "tkt_123",
      "protocol": "SIN-1042",
      "description_summary": "O projetor da sala não está ligando",
      "current_sector": {
        "id": "sec_ti",
        "name": "TI"
      },
      "status": "IN_PROGRESS",
      "created_at": "2026-08-20T14:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```

### O que faz

- Alimenta a Tela A.2 “Meus chamados”.
- Permite os filtros Todos / Abertos / Resolvidos.
- Nunca deve retornar chamados de outros solicitantes para um usuário comum.

---

## 8.3 `GET /tickets/{ticketId}`

### O que recebe

Path parameter:

```text
ticketId
```

### O que retorna

```json
{
  "id": "tkt_123",
  "protocol": "SIN-1042",
  "description": "O projetor da sala não está ligando",
  "location": {
    "building": {
      "id": "bld_01",
      "name": "Bloco A"
    },
    "environment": {
      "id": "env_101",
      "name": "Sala 101"
    }
  },
  "photos": [
    {
      "id": "photo_1",
      "url": "https://arquivos.exemplo/tkt_123/photo_1"
    }
  ],
  "status": "IN_PROGRESS",
  "automatic_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "confirmed_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "current_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "timeline": [
    {
      "type": "TICKET_OPENED",
      "description": "Chamado aberto",
      "created_at": "2026-08-20T14:30:00Z"
    },
    {
      "type": "STATUS_CHANGED",
      "description": "Chamado em andamento",
      "created_at": "2026-08-20T15:05:00Z"
    }
  ]
}
```

### O que faz

- Alimenta a Tela A.6 e o detalhe do portal.
- Retorna descrição, local, fotos e setor atual.
- Retorna todos os eventos da linha do tempo.
- Reflete sempre o **setor responsável atual**, inclusive após reencaminhamento.

### Controle de acesso

- Solicitante: somente chamados próprios.
- Setor: chamados que pertencem/pertenceram à sua atuação conforme política definida.
- Admin: qualquer chamado.

---

# 9. Notificações

## 9.1 `GET /notifications`

### O que recebe

```text
?page=1
?page_size=30
```

### O que retorna

```json
{
  "items": [
    {
      "id": "ntf_123",
      "ticket_id": "tkt_123",
      "protocol": "SIN-1042",
      "type": "TICKET_RESOLVED",
      "message": "Seu chamado SIN-1042 foi resolvido.",
      "created_at": "2026-08-20T18:20:00Z"
    }
  ]
}
```

### O que faz

- Alimenta a Tela A.7.
- Mantém o histórico dos avisos enviados via push.
- Cada item referencia o chamado correspondente.

### Quando gerar notificação

A documentação exige avisos sobre andamento e resolução. Uma implementação coerente é gerar uma notificação em mudanças relevantes de status e reencaminhamento.

---

# 10. Portal do setor

## 10.1 `GET /sector/tickets`

### O que recebe

Filtros:

```text
?sector_id=sec_ti
?status=FORWARDED,IN_PROGRESS
?from=2026-08-01
?to=2026-08-31
?building_id=bld_01
?search=SIN-1042
?sort=created_at
?order=asc
?page=1
?page_size=50
```

### O que retorna

```json
{
  "items": [
    {
      "id": "tkt_123",
      "protocol": "SIN-1042",
      "description_summary": "O projetor da sala não está ligando",
      "location": "Bloco A / Sala 101",
      "status": "FORWARDED",
      "automatic_sector_id": "sec_ti",
      "confirmed_sector_id": "sec_manutencao",
      "classification_diverged": true,
      "created_at": "2026-08-20T14:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 50,
  "total": 1
}
```

### O que faz

- Alimenta as Telas B.2 e B.4.
- Por padrão, retorna os chamados mais antigos primeiro.
- Permite filtrar por status, período e local/prédio.
- Informa se a classificação automática divergiu da confirmada pelo solicitante.
- Para resolvidos, pode ser usado com `status=RESOLVED` e busca por protocolo/local/texto.

### Regra de segurança

Um responsável de setor só pode consultar filas dos setores aos quais está vinculado.

---

## 10.2 `PATCH /tickets/{ticketId}/status`

### O que recebe

```json
{
  "status": "IN_PROGRESS"
}
```

ou:

```json
{
  "status": "RESOLVED"
}
```

### O que retorna

```json
{
  "id": "tkt_123",
  "protocol": "SIN-1042",
  "status": "IN_PROGRESS",
  "updated_at": "2026-08-20T15:05:00Z"
}
```

### O que faz

Para `IN_PROGRESS`:

- Registra que o setor confirmou o recebimento e iniciou o tratamento.
- Adiciona evento à linha do tempo.
- Gera histórico/notificação ao solicitante.

Para `RESOLVED`:

- Marca o chamado como resolvido.
- Registra o setor atual como `resolved_by_sector_id`.
- Registra `resolved_at`.
- Adiciona evento à linha do tempo.
- Gera notificação push e histórico para o solicitante.

### Regras

O setor não pode escolher livremente qualquer status. Neste MVP, a Tela B.3 só permite:

```text
Em andamento
Resolvido
```

Não existe reabertura nesta versão.

---

## 10.3 `POST /tickets/{ticketId}/reassign`

### O que recebe

```json
{
  "target_sector_id": "sec_manutencao",
  "reason": "O defeito é elétrico/predial e não de equipamento de TI."
}
```

### O que retorna

```json
{
  "id": "tkt_123",
  "protocol": "SIN-1042",
  "status": "FORWARDED",
  "previous_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "current_sector": {
    "id": "sec_manutencao",
    "name": "Manutenção Predial"
  },
  "reclassified_at": "2026-08-20T15:20:00Z"
}
```

### O que faz

- Registra uma **reclassificação**.
- Registra obrigatoriamente o motivo.
- Guarda o setor anterior e o novo setor.
- Move o chamado para a fila do novo setor.
- Define o status novamente como `FORWARDED`.
- Cria evento na linha do tempo, por exemplo “Redirecionado para Manutenção Predial”.
- Marca que houve correção pelo setor para os indicadores da pesquisa.
- Notifica o solicitante.

### Regra crítica

A reclassificação é um **evento**, não um status persistente.

---

## 10.4 `PATCH /tickets/{ticketId}/internal-note`

### O que recebe

```json
{
  "internal_note": "Foi solicitado teste do equipamento antes da troca."
}
```

### O que retorna

```json
{
  "success": true,
  "updated_at": "2026-08-20T15:25:00Z"
}
```

### O que faz

- Salva/atualiza uma observação de atendimento.
- Essa informação é visível apenas para setor e administração.
- Não deve aparecer para o solicitante.

---

# 11. Administração - chamados e painel

## 11.1 `GET /admin/tickets`

### O que recebe

```text
?sector_id=sec_ti
?status=IN_PROGRESS
?from=2026-08-01
?to=2026-08-31
?building_id=bld_01
?search=SIN-1042
?page=1
?page_size=50
```

### O que retorna

```json
{
  "items": [
    {
      "id": "tkt_123",
      "protocol": "SIN-1042",
      "description_summary": "O projetor da sala não está ligando",
      "current_sector": {
        "id": "sec_ti",
        "name": "TI"
      },
      "status": "IN_PROGRESS",
      "created_at": "2026-08-20T14:30:00Z"
    }
  ],
  "page": 1,
  "page_size": 50,
  "total": 1
}
```

### O que faz

- Permite ao administrador consultar chamados de todos os setores.
- Alimenta a listagem geral da administração.

---

## 11.2 `GET /admin/dashboard`

### O que recebe

Filtros opcionais:

```text
?sector_id=sec_ti
?status=IN_PROGRESS
?from=2026-08-01
?to=2026-08-31
?building_id=bld_01
```

### O que retorna

```json
{
  "summary": {
    "volume": 248,
    "resolved_percentage": 76.2,
    "average_time_to_correct_sector_minutes": 34.8
  },
  "by_sector": [
    {
      "sector_id": "sec_ti",
      "sector_name": "TI",
      "forwarded": 12,
      "in_progress": 7,
      "resolved": 83
    }
  ]
}
```

### O que faz

- Alimenta a Tela C.1.
- Calcula volume no período.
- Calcula percentual resolvido.
- Calcula tempo médio até o setor correto.
- Retorna visão consolidada de fila e atendimento por setor.

---

# 12. Administração - setores e categorias

## 12.1 `GET /admin/sectors`

### O que recebe

Opcionalmente:

```text
?search=manutencao
```

### O que retorna

```json
{
  "items": [
    {
      "id": "sec_manutencao",
      "name": "Manutenção Predial",
      "categories": [
        "vazamento",
        "elétrica",
        "porta",
        "janela"
      ],
      "responsible_users": [
        {
          "id": "usr_456",
          "name": "João Souza",
          "email": "joao@instituicao.edu.br"
        }
      ]
    }
  ]
}
```

### O que faz

- Alimenta a Tela C.2.
- Exibe setores, categorias associadas e responsáveis vinculados.

---

## 12.2 `POST /admin/sectors`

### O que recebe

```json
{
  "name": "Manutenção Predial",
  "categories": [
    "vazamento",
    "elétrica",
    "porta",
    "janela"
  ],
  "responsible_user_ids": [
    "usr_456"
  ]
}
```

### O que retorna

```json
{
  "id": "sec_manutencao",
  "name": "Manutenção Predial",
  "categories": [
    "vazamento",
    "elétrica",
    "porta",
    "janela"
  ],
  "responsible_user_ids": [
    "usr_456"
  ]
}
```

### O que faz

- Cria um setor.
- Associa as categorias/tags usadas pela classificação automática.
- Opcionalmente vincula responsáveis.

---

## 12.3 `PATCH /admin/sectors/{sectorId}`

### O que recebe

```json
{
  "name": "Manutenção Predial",
  "categories": [
    "vazamento",
    "elétrica",
    "infraestrutura"
  ],
  "responsible_user_ids": [
    "usr_456",
    "usr_789"
  ]
}
```

### O que retorna

```json
{
  "id": "sec_manutencao",
  "name": "Manutenção Predial",
  "categories": [
    "vazamento",
    "elétrica",
    "infraestrutura"
  ],
  "responsible_user_ids": [
    "usr_456",
    "usr_789"
  ]
}
```

### O que faz

- Atualiza nome do setor.
- Atualiza categorias usadas pela classificação.
- Atualiza responsáveis vinculados ao setor.

### Observação

A documentação funcional não define exclusão de setor. Por isso, um `DELETE /admin/sectors/{id}` não foi incluído como requisito deste MVP.

---

# 13. Administração - importação de usuários

## 13.1 `GET /admin/users/import-template`

### O que recebe

Nada além da autenticação de administrador.

### O que retorna

Arquivo de planilha, por exemplo:

```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="modelo_usuarios_sinaliza.xlsx"
```

### O que faz

- Gera/retorna a planilha-modelo exigida pela Tela C.3.
- O modelo deve possuir as colunas oficiais esperadas pelo importador.

### Colunas descritas funcionalmente

```text
nome
e-mail institucional
vínculo
setor/papel, quando aplicável
```

A documentação não fixa os nomes técnicos exatos das colunas. Eles devem ser definidos e mantidos estáveis pelo sistema.

---

## 13.2 `POST /admin/users/import`

### O que recebe

`multipart/form-data`:

```text
file = usuarios.xlsx
```

### O que retorna - sucesso

```json
{
  "success": true,
  "created": 120,
  "updated": 18
}
```

### O que retorna - erro de modelo

```json
{
  "success": false,
  "error": "INVALID_TEMPLATE",
  "details": [
    {
      "type": "COLUMN_ORDER_MISMATCH",
      "expected": "email_institucional",
      "received": "vinculo",
      "column_index": 2
    }
  ],
  "created": 0,
  "updated": 0
}
```

### O que faz

1. Recebe a planilha.
2. Valida **todo o arquivo e seu formato antes de persistir qualquer usuário**.
3. Confere exatamente o modelo esperado.
4. Rejeita a importação inteira se houver divergência de estrutura.
5. Se estiver válido, cria novas contas e atualiza as existentes.
6. Retorna quantidades criadas/atualizadas.

### Regra crítica: atomicidade

Se houver qualquer erro de formato:

```text
nenhum usuário deve ser criado
nenhum usuário deve ser atualizado
```

A importação deve funcionar como uma operação atômica.

### Exemplos de erro que devem rejeitar o arquivo inteiro

- coluna ausente;
- coluna fora de ordem;
- nome de coluna diferente do modelo;
- formato estrutural incompatível.

---

# 14. Administração - usuários e permissões

## 14.1 `GET /admin/users`

### O que recebe

Filtros sugeridos:

```text
?search=maria
?role=ADMIN
?sector_id=sec_ti
?access=active
?page=1
?page_size=50
```

### O que retorna

```json
{
  "items": [
    {
      "id": "usr_123",
      "name": "Maria Silva",
      "email": "maria@instituicao.edu.br",
      "institutional_link": "SERVIDOR",
      "roles": ["SECTOR"],
      "sector_ids": ["sec_ti"],
      "access_revoked": false
    }
  ],
  "total": 1
}
```

### O que faz

- Alimenta a Tela C.4.
- Consulta contas trazidas pela importação.
- Permite localizar usuários por papel/setor.

---

## 14.2 `PATCH /admin/users/{userId}/permissions`

### O que recebe

Exemplo de responsável por dois setores:

```json
{
  "roles": ["SECTOR"],
  "sector_ids": [
    "sec_ti",
    "sec_audiovisual"
  ]
}
```

Exemplo de administrador:

```json
{
  "roles": ["ADMIN"],
  "sector_ids": []
}
```

### O que retorna

```json
{
  "id": "usr_123",
  "roles": ["SECTOR"],
  "sector_ids": [
    "sec_ti",
    "sec_audiovisual"
  ]
}
```

### O que faz

- Ajusta individualmente o papel do usuário.
- Vincula um usuário a um ou mais setores.
- Permite tornar um usuário administrador.
- Evita a necessidade de realizar uma nova importação apenas para mudar permissões.

---

## 14.3 `POST /admin/users/{userId}/revoke`

### O que recebe

```json
{}
```

Opcionalmente, por auditoria técnica:

```json
{
  "reason": "Usuário não faz mais parte da equipe"
}
```

### O que retorna

```json
{
  "id": "usr_123",
  "access_revoked": true
}
```

### O que faz

- Revoga o acesso do usuário.
- Mantém a conta e o histórico de atendimentos anteriores.
- Impede novos logins/uso das permissões.

### Regra crítica

Revogar **não é excluir**.

O histórico de quem tratou chamados deve continuar íntegro.

---

## 14.4 `POST /admin/users/{userId}/restore`

### O que recebe

```json
{}
```

### O que retorna

```json
{
  "id": "usr_123",
  "access_revoked": false
}
```

### O que faz

- Reativa uma conta previamente revogada.

### Observação

A restauração não aparece explicitamente como ação em tela na documentação, mas é a operação complementar necessária caso uma revogação seja reversível. Se o produto decidir que revogação é definitiva, este endpoint pode ser removido.

---

# 15. Indicadores da pesquisa

## 15.1 `GET /admin/research/indicators`

### O que recebe

Filtros sugeridos:

```text
?from=2026-08-01
?to=2026-08-31
?sector_id=sec_ti
?building_id=bld_01
```

### O que retorna

```json
{
  "automatic_accuracy": {
    "total_tickets": 200,
    "correct_without_any_correction": 162,
    "percentage": 81.0
  },
  "corrections": {
    "by_requester": 22,
    "by_sector": 16
  },
  "time_to_correct_sector": {
    "average_minutes": 34.8,
    "median_minutes": 12.5
  },
  "volume": {
    "by_sector": [
      {
        "sector_id": "sec_ti",
        "sector_name": "TI",
        "count": 67
      }
    ],
    "by_category": [
      {
        "category": "equipamento",
        "count": 43
      }
    ],
    "by_location": [
      {
        "building_id": "bld_01",
        "building_name": "Bloco A",
        "count": 55
      }
    ]
  }
}
```

### O que faz

Calcula os indicadores da Tela C.5 e da Seção 8 da documentação.

### 1. Taxa de acerto automático

Um chamado conta como acerto quando:

```text
automatic_sector_id == resolved_by_sector_id
E requester_corrected == false
E sector_reclassified == false
```

### 2. Correção pelo solicitante

Ocorre quando:

```text
automatic_sector_id != confirmed_sector_id
```

### 3. Correção pelo setor

Ocorre quando existe pelo menos um evento de reclassificação/reencaminhamento feito por setor.

### 4. Tempo até o setor correto

Definição funcional:

```text
da abertura do chamado até ele estar na fila do setor que efetivamente o resolveu
```

Cálculo:

```text
correct_sector_reached_at - created_at
```

Para calcular isso corretamente, a API/backend deve preservar o histórico de movimentações entre setores, e não apenas o `current_sector_id` final.

### 5. Volume

Agrupar chamados por:

- setor;
- categoria;
- local.

---

## 15.2 `GET /admin/research/export`

### O que recebe

Filtros opcionais:

```text
?from=2026-08-01
?to=2026-08-31
?format=xlsx
```

### O que retorna

Arquivo para análise externa:

```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="sinaliza_pesquisa_2026-08.xlsx"
```

### O que faz

- Exporta os dados necessários para análise externa da pesquisa.
- Deve incluir informações de classificação automática, confirmação humana, reclassificações e tempos.

### Campos recomendados na exportação

```text
ticket_id
protocol
created_at
description
building
environment
automatic_sector
confirmed_sector
requester_corrected
sector_reclassified
reclassification_count
resolved_by_sector
correct_sector_reached_at
resolved_at
time_to_correct_sector_seconds
time_to_resolution_seconds
```

Também pode incluir os eventos de reclassificação em uma aba/tabela separada.

---

# 16. Estrutura recomendada do objeto `Ticket`

Esta estrutura facilita implementar o fluxo e os indicadores sem perder histórico.

```json
{
  "id": "tkt_123",
  "protocol": "SIN-1042",
  "requester_id": "usr_123",
  "description": "O projetor da sala não está ligando",
  "location": {
    "building_id": "bld_01",
    "environment_id": "env_101"
  },
  "photos": [],
  "automatic_sector_id": "sec_ti",
  "confirmed_sector_id": "sec_ti",
  "current_sector_id": "sec_ti",
  "resolved_by_sector_id": null,
  "requester_corrected": false,
  "sector_reclassified": false,
  "status": "FORWARDED",
  "created_at": "2026-08-20T14:30:00Z",
  "updated_at": "2026-08-20T14:30:00Z",
  "correct_sector_reached_at": null,
  "resolved_at": null
}
```

---

# 17. Estrutura recomendada da linha do tempo

Para não perder dados da pesquisa, é recomendável tratar alterações importantes como eventos imutáveis.

```json
{
  "id": "evt_123",
  "ticket_id": "tkt_123",
  "type": "REASSIGNED",
  "actor_user_id": "usr_456",
  "actor_role": "SECTOR",
  "from_sector_id": "sec_ti",
  "to_sector_id": "sec_manutencao",
  "from_status": "FORWARDED",
  "to_status": "FORWARDED",
  "reason": "Chamado pertence à manutenção predial",
  "created_at": "2026-08-20T15:20:00Z"
}
```

### Tipos de evento sugeridos

```text
TICKET_OPENED
AUTO_CLASSIFIED
REQUESTER_CONFIRMED_SECTOR
REQUESTER_CHANGED_SECTOR
STATUS_CHANGED
REASSIGNED
TICKET_RESOLVED
```

Essa nomenclatura é uma decisão técnica; o requisito funcional é preservar abertura, encaminhamentos, mudanças de status e reencaminhamentos com data/hora.

---

# 18. Regras de negócio que a API não pode quebrar

## RB-01 - Sem autocadastro

Usuários só acessam o sistema se já existirem na base importada pela administração.

## RB-02 - Classificação usa somente descrição

Fotos não podem participar da classificação automática neste MVP.

## RB-03 - Preservar classificação original

Mesmo que o solicitante altere o setor, `automatic_sector_id` nunca deve ser sobrescrito.

## RB-04 - Preservar decisão do solicitante

`confirmed_sector_id` representa a decisão da Tela A.4 e também não deve ser sobrescrito caso um setor reclassifique posteriormente.

## RB-05 - Setor atual é mutável

`current_sector_id` muda quando ocorre reencaminhamento.

## RB-06 - Reclassificação é evento

Nunca deixar um chamado “parado” em status `RECLASSIFIED`.

Após reencaminhar:

```text
current_sector_id = target_sector_id
status = FORWARDED
```

## RB-07 - Motivo obrigatório ao reencaminhar

Não permitir reclassificação sem `reason`.

## RB-08 - Fila do setor isolada

Equipe de setor só enxerga os chamados dos setores que possui permissão para acessar.

## RB-09 - Ordem padrão da fila

Chamados ativos do setor devem ser ordenados do mais antigo para o mais recente.

## RB-10 - Sem reabertura

Não criar transição `RESOLVED → IN_PROGRESS/OPEN` neste MVP.

## RB-11 - Sem prioridade/SLA

Não adicionar prioridade, urgência ou SLA como requisito desta versão.

## RB-12 - Importação atômica

Qualquer incompatibilidade com o modelo invalida o arquivo inteiro, sem alterações parciais.

## RB-13 - Revogação preserva histórico

Nunca apagar registros de atendimento/reclassificação quando um usuário tiver acesso revogado.

## RB-14 - Resolução gera notificação

Ao marcar como resolvido, o solicitante deve receber push e o evento deve aparecer no histórico de notificações.

## RB-15 - Toda mudança relevante entra na linha do tempo

Guardar data/hora de:

- abertura;
- encaminhamento inicial;
- mudança para Em andamento;
- reencaminhamentos;
- resolução.

---

# 19. Matriz de permissões

| Ação | Solicitante | Setor | Admin |
|---|:---:|:---:|:---:|
| Login | ✅ | ✅ | ✅ |
| Ver próprio perfil | ✅ | ✅ | ✅ |
| Classificar relato | ✅ | ❌ | ❌ |
| Criar chamado | ✅ | ❌ | ❌ |
| Ver próprios chamados | ✅ | ❌ | ✅ |
| Ver fila de setor | ❌ | ✅ somente setores vinculados | ✅ |
| Alterar status | ❌ | ✅ setor autorizado | ✅ |
| Reencaminhar | ❌ | ✅ setor autorizado | ✅ |
| Ver observação interna | ❌ | ✅ | ✅ |
| Editar observação interna | ❌ | ✅ | ✅ |
| Cadastrar/editar setores | ❌ | ❌ | ✅ |
| Importar usuários | ❌ | ❌ | ✅ |
| Alterar permissões | ❌ | ❌ | ✅ |
| Revogar acesso | ❌ | ❌ | ✅ |
| Ver indicadores de pesquisa | ❌ | ❌ | ✅ |
| Exportar dados de pesquisa | ❌ | ❌ | ✅ |

---

# 20. Fluxos completos usando os endpoints

## 20.1 Abrir um chamado

```text
1. POST /auth/login
2. GET /locations
3. POST /classification/preview
4. GET /sectors
5. POST /tickets
6. GET /tickets/{ticketId}
```

### Fluxo

1. Usuário escreve descrição, escolhe prédio/ambiente e seleciona fotos.
2. App chama `/classification/preview` com **apenas a descrição**.
3. API retorna o setor sugerido.
4. App mostra a sugestão e a lista de setores.
5. Usuário confirma ou escolhe outro.
6. App cria o chamado enviando setor automático + setor confirmado.
7. Backend registra qualquer divergência.

---

## 20.2 Setor iniciar atendimento

```text
1. GET /sector/tickets
2. GET /tickets/{ticketId}
3. PATCH /tickets/{ticketId}/status
```

Body:

```json
{
  "status": "IN_PROGRESS"
}
```

---

## 20.3 Setor recebeu chamado errado

```text
1. GET /tickets/{ticketId}
2. GET /sectors
3. POST /tickets/{ticketId}/reassign
```

Body:

```json
{
  "target_sector_id": "sec_manutencao",
  "reason": "Problema pertence à manutenção predial"
}
```

Resultado:

```text
- registra REASSIGNED
- troca current_sector_id
- status volta para FORWARDED
- chamado aparece na fila do novo setor
- divergência fica disponível para a pesquisa
```

---

## 20.4 Resolver chamado

```text
PATCH /tickets/{ticketId}/status
```

```json
{
  "status": "RESOLVED"
}
```

Resultado:

```text
- status = RESOLVED
- resolved_by_sector_id = current_sector_id
- resolved_at = agora
- evento registrado
- push enviado
- notificação salva no histórico
```

---

## 20.5 Importar usuários

```text
1. GET /admin/users/import-template
2. administrador preenche o arquivo
3. POST /admin/users/import
4. backend valida 100% do arquivo
5. se existir qualquer erro estrutural: rollback/rejeita tudo
6. se estiver válido: cria/atualiza os usuários
```

---

# 21. Pontos que ainda precisam de decisão técnica

A documentação funcional não especifica os itens abaixo. Eles precisam ser decididos durante a arquitetura/desenvolvimento:

1. **Provedor de autenticação institucional**
   - LDAP, Active Directory, SSO/OAuth, API própria etc.

2. **Origem do cadastro de prédios e ambientes**
   - configuração fixa, banco próprio, importação ou sistema institucional.

3. **Tecnologia de classificação automática**
   - modelo de IA, embeddings, regras, fine-tuning etc.
   - requisito funcional: entrada deve ser o texto da descrição e saída deve determinar um setor existente.

4. **Armazenamento das fotos**
   - S3/MinIO/storage próprio etc.

5. **Serviço de push**
   - FCM/APNs ou outro mecanismo.

6. **Formato exato da planilha de importação**
   - nomes técnicos das colunas, tipos e validações por linha.

7. **Formato exato da exportação da pesquisa**
   - XLSX/CSV e organização das abas.

8. **Política de visualização histórica por setor**
   - se um setor que reencaminhou um chamado continuará podendo abrir seu detalhe completo depois que ele sair da sua fila.

9. **Confiança da classificação**
   - a documentação não exige score de confiança; é opcional tecnicamente.

---

# 22. Fora do escopo - não criar endpoints agora

Com base na Seção 9 da documentação, não é necessário criar nesta versão:

```text
POST /tickets/{id}/reopen
PATCH /tickets/{id}/priority
GET/POST /whatsapp/...
endpoints de idiomas/localização de interface
```

Também não há requisito para:

- comentários do solicitante após abertura;
- chat com o setor;
- avaliação do atendimento;
- SLA;
- níveis de urgência;
- autocadastro.

---

# 23. Ordem recomendada de implementação

## Etapa 1 - Base

```text
/auth/login
/auth/logout
/me
/sectors
/locations
```

## Etapa 2 - Fluxo principal do solicitante

```text
/classification/preview
/tickets POST
/tickets GET
/tickets/{id} GET
```

## Etapa 3 - Atendimento do setor

```text
/sector/tickets
/tickets/{id}/status
/tickets/{id}/reassign
/tickets/{id}/internal-note
```

## Etapa 4 - Notificações

```text
/devices/push-token
/notifications
```

## Etapa 5 - Administração

```text
/admin/sectors
/admin/users/import-template
/admin/users/import
/admin/users
/admin/users/{id}/permissions
/admin/users/{id}/revoke
```

## Etapa 6 - Pesquisa e indicadores

```text
/admin/dashboard
/admin/research/indicators
/admin/research/export
```

---

# 24. Checklist mínimo para o backend

Antes de considerar o MVP funcional, validar:

- [ ] login somente para conta previamente importada;
- [ ] controle de papel e setores por usuário;
- [ ] descrição em linguagem natural;
- [ ] prédio + ambiente obrigatórios;
- [ ] fotos múltiplas e opcionais;
- [ ] fotos não entram no classificador;
- [ ] classificação automática antes do envio final;
- [ ] solicitante pode trocar o setor sugerido;
- [ ] setor automático original nunca é perdido;
- [ ] setor confirmado pelo solicitante nunca é perdido;
- [ ] protocolo único por chamado;
- [ ] fila isolada por setor;
- [ ] fila ativa ordenada pelos chamados mais antigos;
- [ ] setor pode alterar para Em andamento;
- [ ] setor pode resolver;
- [ ] setor pode reencaminhar com motivo obrigatório;
- [ ] reencaminhamento gera evento e volta para Encaminhado;
- [ ] observação interna não aparece no app do solicitante;
- [ ] todas as mudanças têm data/hora;
- [ ] push/histórico de notificações funcionando;
- [ ] importação de usuários é atômica;
- [ ] administrador acessa todos os chamados;
- [ ] indicadores distinguem correção do solicitante e do setor;
- [ ] cálculo do tempo até o setor correto preserva histórico;
- [ ] exportação de dados para pesquisa;
- [ ] nenhuma reabertura no MVP;
- [ ] nenhuma prioridade/SLA no MVP.

