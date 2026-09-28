# Plano de teste manual: app do solicitante (API + mobile)

Sem o portal web: os usuários são criados por SQL e as ações do setor são feitas pelo
script `tool/manual-test/sector-actions.ps1`. Tempo estimado: 1h30 a 2h.

Legenda: ✅ passou · ❌ falhou (anote o que viu) · ⏭️ pulado

---

## 0. Preparação do ambiente (uma vez, ~20 min)

Use três terminais PowerShell: **T1** para a API, **T2** para a IA e **T3** para o mobile e os scripts.

### 0.1 API (T1, pasta `api/`)

1. `copy .env.example .env` (se ainda não existir) e ajuste:
   ```dotenv
   JWT_EXPIRES_IN=8h                  # o token entregue à IA não expira no meio do teste
   S3_PUBLIC_URL=http://10.0.2.2:9000 # fotos abrem no emulador Android
   AI_MODE=mock
   AI_SERVICE_URL=http://host.docker.internal:3001
   AI_SERVICE_TOKEN=sinaliza-local-demo-public-token-1234
   ```
2. `docker compose up -d --build` e espere a API subir:
   `docker compose logs -f api` até aparecer que está escutando na porta 3000.

   Se o pull do MinIO falhar com `pull access denied for minio/minio` (a imagem saiu do
   Docker Hub), use o fork comunitário `pgsty/minio` com um arquivo extra, sem mexer no
   compose do repositório:
   ```powershell
   Set-Content minio.override.yml "services:`n  minio:`n    image: pgsty/minio:latest"
   docker compose -f docker-compose.yml -f docker-compose.override.yml -f minio.override.yml up -d --build
   ```

   > **Limite de login:** a API aceita 5 logins a cada 15 min por IP (contador em
   > memória). Se o login responder "muitas tentativas", `docker restart Sinaliza_api`
   > zera o contador; as sessões já abertas continuam valendo.
   >
   > **Mudou código da API?** O watch do Nest não percebe alterações feitas no Windows
   > dentro do container: rode `docker restart Sinaliza_api`.
3. Confira http://localhost:3000/api/docs (Swagger) e http://localhost:8025 (MailHog).

### 0.2 Dados de teste (T3, pasta `mobile/`)

```powershell
docker cp tool\manual-test\seed.sql Sinaliza_postgres:/tmp/seed.sql
docker exec Sinaliza_postgres psql -U postgres -d sinaliza -f /tmp/seed.sql
```

(Não use `Get-Content ... | docker exec -i`: o PowerShell 5.1 recodifica o arquivo e
"Secretaria Acadêmica" fica gravado como "AcadÃªmica".)

A saída final deve listar os usuários `admin`, `aluno` e `setor`, e os 5 setores.

| Conta | Login | Senha | Uso no teste |
|-------|-------|-------|--------------|
| Solicitante | `aluno@sinaliza.local` ou matrícula `2023001234` | a mesma do admin (`ADMIN_PASSWORD`) | fluxo principal |
| Equipe de setor | `setor@sinaliza.local` | idem | tela "sem acesso" |
| Admin | `admin@sinaliza.local` | `ADMIN_PASSWORD` | script das ações do setor |

### 0.3 Classificador (T2, pasta `ai/`)

Os modelos não estão no git. Na primeira vez, gere-os com o comando abaixo. O
`--engine-strict=false` é necessário com Node 20: o projeto pede Node 22 só por
causa do vitest.

```powershell
npm ci --engine-strict=false; npm run demo:train; npm run build
```

Pegue um token de acesso do admin (a IA usa esse token para ler os setores da API):

```powershell
$login = Invoke-WebRequest -Method Post -Uri http://localhost:3000/api/v1/auth/login `
  -ContentType 'application/json' -SessionVariable s `
  -Body (@{ identifier='admin@sinaliza.local'; password='<ADMIN_PASSWORD>' } | ConvertTo-Json)
$env:BACKEND_API_TOKEN = ($s.Cookies.GetCookies('http://localhost:3000/api/v1') | ? Name -eq 'access_token').Value
```

Suba o serviço:

```powershell
$env:AI_MODE='mock'; $env:AI_SECTOR_SOURCE='backend'; $env:AI_MODEL_TYPE='tfidf'
$env:AI_MODEL_PATH='models/demo/backend-tfidf.json'
$env:AI_SERVICE_TOKEN='sinaliza-local-demo-public-token-1234'
$env:AI_HOST='0.0.0.0'; $env:AI_PORT='3001'
$env:BACKEND_API_URL='http://127.0.0.1:3000/api/v1'
npm run start:service
```

Se o Windows perguntar sobre o firewall do Node, permita em redes privadas (o
container da API acessa a IA pelo `host.docker.internal`).

### 0.4 App (T3, pasta `mobile/`)

1. Abra um emulador Android (API 33+ recomendado).
2. `flutter run --dart-define-from-file=env/dev.json --dart-define=DEVICE_PREVIEW=false`
   (sem essa flag, o debug abre dentro do DevicePreview, com moldura e barra própria,
   e a tela não fica igual à de um aparelho).
3. Carregue o script do setor:
   ```powershell
   . .\tool\manual-test\sector-actions.ps1
   Connect-Sinaliza -Password '<ADMIN_PASSWORD>'
   ```

**Checagem rápida:** no app, "Novo relato" → descreva "O projetor da sala não liga" →
Continuar deve mostrar um setor sugerido (A.4). Se der erro de classificação, veja
os logs do T2 e o item "Problemas comuns" no fim.

---

## 1. Abertura e sessão

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 1.1 | Abrir o app pela primeira vez | Splash com o símbolo da marca → **Login**, sem aviso de "sessão expirou" | |
| 1.2 | Ícone do app na lista de apps | Ícone teal com o símbolo "Rota Clara"; nome **Sinaliza** | |
| 1.3 | Parar a API (`docker compose stop api`) e abrir o app já logado (depois do item 2.4) | Splash com "Não foi possível verificar sua sessão" + **Tentar novamente**, e **não** vai para o login. Religue a API e toque em Tentar novamente → home | |

## 2. Login (A.1)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 2.1 | Tocar em **Entrar** com os campos vazios | Erros nos dois campos, sem chamar a API | |
| 2.2 | E-mail certo + senha errada | "Usuário ou senha inválidos…" (sem dizer se a conta existe) | |
| 2.3 | Botão de olho na senha | Mostra/oculta a senha | |
| 2.4 | Login com **matrícula** `2023001234`, enviando pelo "done" do teclado | Botão em loading → **Meus chamados** | |
| 2.5 | Sair (Perfil) e entrar com **e-mail** `aluno@sinaliza.local` | Entra | |
| 2.6 | Tocar Entrar duas vezes rápido | Uma só requisição (botão em loading) | |
| 2.7 | Não há link de "Criar conta" | Confirmado | |
| 2.8 | **Esqueci minha senha** com a matrícula digitada no login | O campo de e-mail do sheet abre **vazio** (matrícula não serve) | |
| 2.9 | Informar `aluno@sinaliza.local` e enviar | "Se o e-mail estiver cadastrado…"; o e-mail chega no **MailHog** (localhost:8025) | |
| 2.10 | Enviar um e-mail inexistente | A **mesma** confirmação neutra | |
| 2.11 | Entrar com `setor@sinaliza.local` | Tela **"Este aplicativo é para solicitantes. Use o portal web."** com Sair; Sair → login | |

## 3. Meus chamados (A.2), conta nova

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 3.1 | Primeira entrada com o aluno | Skeleton → "Você ainda não abriu chamados." | |
| 3.2 | Abas **Abertos** e **Resolvidos** | Vazios próprios de cada aba | |
| 3.3 | Botão voltar do Android na home | App vai para segundo plano (não volta ao login) | |

## 4. Novo relato (A.3)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 4.1 | "Novo relato" | Tela com descrição, Local e Fotos; **Continuar desabilitado** | |
| 4.2 | Só espaços na descrição | Continuar segue desabilitado | |
| 4.3 | Campo **Ambiente** antes do prédio | Bloqueado com "Escolha o prédio primeiro." | |
| 4.4 | Prédio → busca "bib" (sem acento) | Filtra; escolher prédio libera o Ambiente | |
| 4.5 | Escolher ambiente, depois trocar o prédio | O ambiente é **limpo** | |
| 4.6 | Contador de caracteres | Mostra `x/2000` e não passa de 2000 | |
| 4.7 | **Câmera** (a câmera do emulador serve) | Miniatura aparece; "1 de 5" | |
| 4.8 | **Galeria**, escolher várias | Até completar 5; com 5, botões desabilitados | |
| 4.9 | Remover uma foto (X) | Some da lista | |
| 4.10 | Negar a permissão de câmera/fotos (Ajustes do Android) e tentar anexar | Diálogo com **Abrir ajustes** | |
| 4.11 | Voltar com dados preenchidos | "Descartar relato?". **Continuar editando** mantém; **Descartar** sai | |
| 4.12 | Parar a IA (Ctrl+C no T2) e tocar Continuar | Mensagem de erro + botão **Tentar novamente**; nada do que foi preenchido se perde. Religue a IA e tente de novo → A.4 | |
| 4.13 | Relato "O projetor da sala 101 não liga", com local e 2 fotos → Continuar | "Identificando o setor responsável..." → A.4 | |

## 5. Confirmação do setor (A.4)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 5.1 | Chegar na A.4 | Cartão "Identificamos que este problema é do setor: **X**"; "Enviar para" = X | |
| 5.2 | Resumo | Descrição, "Prédio · Ambiente", "2 fotos" | |
| 5.3 | **Editar** | Volta à A.3 com **tudo** preenchido (inclusive fotos); Continuar volta à A.4 sem nova classificação | |
| 5.4 | **Enviar chamado** (confirmando a sugestão) | Barra de progresso do envio → A.5 | |

## 6. Chamado enviado (A.5)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 6.1 | Tela | "Chamado enviado", **#SIN-xxxx** e "Encaminhado para X". **Anote o protocolo** (P1) | |
| 6.2 | Tocar no protocolo | "Protocolo copiado." | |
| 6.3 | Voltar do Android | Vai para **Meus chamados** (nunca para o formulário), com P1 no topo | |

## 7. Segundo chamado, trocando o setor

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 7.1 | Novo relato "Vazamento na pia do banheiro do térreo", sem fotos → A.4 | Sugestão exibida | |
| 7.2 | Em "Enviar para", escolher **outro** setor | Aviso "Você alterou o setor sugerido." | |
| 7.3 | Enviar → **Ver chamado** | Abre a A.6 do chamado (P2). Anote o protocolo | |
| 7.4 | Linha do tempo | Evento "Solicitante **alterou** o setor sugerido para …" (e em P1: "Solicitante **confirmou** o setor …") | |
| 7.5 | Voltar | Vai para Meus chamados (não para a A.5) | |

## 8. Detalhe (A.6) e ações do setor (T3, script)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 8.1 | Abrir P1 | #protocolo + chip **Encaminhado**, setor responsável, descrição, "Prédio · Ambiente", **Fotos (2)** | |
| 8.2 | Tocar numa foto | Tela cheia; pinça/duplo toque dá zoom; deslizar troca de foto | |
| 8.3 | `Set-TicketStatus <P1> IN_PROGRESS` → puxar a tela para baixo | Chip **Em andamento**; evento "Chamado alterado para Em andamento." no topo | |
| 8.4 | `Move-Ticket <P1> TI 'Equipamento de projeção'` → puxar | **Setor responsável = TI**; evento destacado "Redirecionado para TI: Equipamento de projeção." | |
| 8.5 | `Set-TicketStatus <P1> RESOLVED` → puxar | Chip **Resolvido**; evento de resolução | |
| 8.6 | Meus chamados: abas | P1 só em **Todos** e **Resolvidos**; P2 em **Todos** e **Abertos** | |
| 8.7 | Com o detalhe aberto, `Set-TicketStatus <P2> IN_PROGRESS` e voltar à lista | Lista recarregada com o status novo | |

## 9. Notificações (A.7)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 9.1 | Aba **Notificações** | Avisos das ações do item 8 (status, reencaminhamento, resolvido), com ícones diferentes, #protocolo e "há x min" | |
| 9.2 | Tocar num aviso | Abre a A.6 do chamado certo | |
| 9.3 | Ficar na aba Chamados, rodar `Move-Ticket <P2> Biblioteca 'teste'` e voltar para Notificações | Aviso novo aparece (recarrega ao entrar na aba) | |

## 10. Perfil (A.8) e sair

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 10.1 | Aba Perfil | Maria Aluna, **Vínculo: Aluno**, e-mail, sem campos editáveis; "Versão 1.0.0 (1)" no rodapé | |
| 10.2 | Puxar para baixo | Recarrega sem erro | |
| 10.3 | **Sair** → Cancelar | Continua logado | |
| 10.4 | **Sair** → confirmar | Vai para o login | |
| 10.5 | Fechar o app (remover dos recentes) e abrir | Login (sessão encerrada) | |
| 10.6 | Entrar de novo, fechar e abrir o app | Vai direto para Meus chamados (**sessão mantida**, sem piscar o login) | |

## 11. Sem rede e erros

Use o modo avião do emulador ou `docker compose stop api`.

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 11.1 | Sem rede: puxar a lista de chamados | Aviso de erro, e a lista continua na tela | |
| 11.2 | Sem rede: abrir um chamado | Erro com **Tentar novamente** (sem tela vermelha nem loading infinito) | |
| 11.3 | Sem rede: tentar logar | Mensagem de conexão | |
| 11.4 | Sem rede: enviar um chamado na A.4 | Mensagem de erro; ao voltar a rede, **Tentar novamente** envia (um só chamado) | |
| 11.5 | Sem rede: Sair | Vai para o login mesmo assim | |

## 12. Sessão no servidor

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 12.1 | Logado como aluno, desativar a conta: `docker exec -i sinaliza_postgres psql -U postgres -d sinaliza -c "UPDATE users SET status='INACTIVE' WHERE email='aluno@sinaliza.local'"` → fechar e abrir o app | Volta ao login com "Sua sessão expirou. Entre novamente." e não consegue logar | |
| 12.2 | Reativar (`status='ACTIVE'`) | Loga de novo | |
| 12.3 | **Por último** (quebra a IA): em `api/.env`, `JWT_EXPIRES_IN=1m` → `docker compose up -d api` → logar → esperar 2 min → puxar a lista | Carrega normalmente (**renovação automática**, sem voltar ao login) | |

## 13. Acessibilidade (opcional)

| # | Passo | Esperado | Resultado |
|---|-------|----------|-----------|
| 13.1 | Ajustes do Android → tamanho da fonte no máximo; percorrer login, lista, A.3, A.4, A.6 | Nada cortado nem sobreposto; chips/datas quebram linha | |
| 13.2 | TalkBack na lista | Cada chamado é lido como uma frase (protocolo, status, setor, resumo) | |

## Fora deste teste

- **Push**: o Firebase não está configurado (o app segue sem push, e não aparece o diálogo
  "Receber avisos"). Veja o README, seção "Push".
- **iPhone**: precisa de um Mac.

---

## Problemas comuns

| Sintoma | Causa provável / solução |
|---------|--------------------------|
| App fica parado na splash (e o Android acusa "não está respondendo") | O `app-debug.apk` instalado é o dos testes de integração: `flutter test integration_test` grava por cima do mesmo arquivo. Gere o app de novo (`flutter build apk --debug ...` ou `flutter run`) antes de instalar |
| App volta ao login com "Sua sessão expirou" depois de entrar em outro aparelho | Esperado: a API guarda um refresh token por usuário, então o último login derruba o anterior quando o token de acesso vence |
| Continuar (A.3) → erro "classificação desativada" | `AI_MODE` não está `mock` no `api/.env` → ajuste e `docker compose up -d api` |
| Continuar → erro de servidor | IA fora do ar, porta 3001 bloqueada pelo firewall, ou `BACKEND_API_TOKEN` expirado (gere de novo, item 0.3) |
| Setor sugerido não existe / 404 ao enviar | O seed de setores não rodou (item 0.2) |
| Fotos quebradas na A.6 | `S3_PUBLIC_URL` não é `http://10.0.2.2:9000` (ajuste e recrie a API; vale para chamados **novos**) |
| "Muitas tentativas" no login | Limite de 5/15 min por IP. `docker exec sinaliza_redis redis-cli -a <REDIS_PASSWORD> FLUSHALL` e `docker compose restart api` |
| Login funciona, mas a próxima tela dá "sessão expirou" | `COOKIE_SECURE` precisa ser `false` no `api/.env` (HTTP local) |
| App não conecta | Emulador usa `10.0.2.2` (já no `env/dev.json`); em aparelho físico, crie `env/device.json` com o IP do PC |
