# Sinaliza - app mobile (solicitante)

App Flutter usado pelo solicitante para abrir e acompanhar chamados (Telas A.1 a A.8
da [documentação funcional](../documentacao-funcional-sinaliza.md)). Consome a API em
[`../api`](../api), descrita em [endpoints-sinaliza.md](../endpoints-sinaliza.md).

O backlog de implementação está em [`tasks/`](tasks/README.md).

## Requisitos

- Flutter 3.35+ (Dart 3.9+)
- Android Studio (emulador Android) e/ou Xcode (simulador iOS)
- A API rodando localmente (veja [`../api/README.md`](../api/README.md))

## Configuração por ambiente

Nenhuma URL fica no código. Os valores entram em tempo de build via
`--dart-define-from-file` e são lidos em `lib/src/core/config/env.dart`.

| Variável       | Obrigatória | Descrição                                   |
|----------------|-------------|---------------------------------------------|
| `API_BASE_URL` | sim         | URL da API **com** o prefixo `/api/v1`       |
| `ENV`          | não         | Nome do ambiente (`dev`, `prod`), informativo |

Arquivos em [`env/`](env/):

| Arquivo              | Uso                                                        |
|----------------------|------------------------------------------------------------|
| `dev.json`           | Emulador Android (`10.0.2.2` aponta para o `localhost` do PC) |
| `dev.ios.json`       | Simulador iOS (`localhost`)                                |
| `prod.example.json`  | Modelo. Copie para `prod.json` (ignorado pelo git)         |

Para testar num aparelho físico, crie um `env/device.json` (ignorado pelo git) com o IP
do PC na rede local, ex.: `http://192.168.0.10:3000/api/v1`.

Se o app iniciar sem `API_BASE_URL`, ele falha na hora com uma mensagem explicando o
que falta.

## Rodando

```bash
flutter pub get

# Emulador Android
flutter run --dart-define-from-file=env/dev.json

# Simulador iOS
flutter run --dart-define-from-file=env/dev.ios.json
```

Em debug o app abre dentro do [DevicePreview](https://pub.dev/packages/device_preview)
para testar tamanhos de tela. Ele fica desligado em profile e release. Para usar a
tela inteira em debug (teste manual em emulador ou aparelho), acrescente
`--dart-define=DEVICE_PREVIEW=false`.

Em debug no Android o tráfego HTTP (cleartext) é liberado para falar com a API local
(`android/app/src/debug/AndroidManifest.xml`). O build release só aceita HTTPS.

## Build release

Veja [docs/release.md](docs/release.md): versão, assinatura (keystore fora do git),
builds AAB/APK/IPA, App Distribution/TestFlight e ambientes. O build de release exige
`API_BASE_URL` em **HTTPS**. Para os participantes do piloto, há o
[guia rápido](docs/guia-piloto.md).

## Qualidade

```bash
flutter analyze
dart format --output=none --set-exit-if-changed lib test integration_test tool
flutter test                       # unitários, widget e acessibilidade
```

- `test/accessibility_test.dart` verifica, nas telas A.1 a A.8, alvos de toque de
  pelo menos 48 dp, rótulos nas ações, contraste de texto e fonte a 200% sem overflow.
- O CI (`.github/workflows/mobile.yml`) roda formatação, análise e testes em PRs e
  pushes que alteram `mobile/`.

### Testes de integração (API real)

Com a API local no ar (`api/` com docker-compose + seed) e um emulador aberto:

```bash
flutter test integration_test   --dart-define-from-file=env/dev.json   --dart-define=TEST_IDENTIFIER=<matrícula ou e-mail de um solicitante>   --dart-define=TEST_PASSWORD=<senha>
```

Cobrem o fluxo 20.1 (login, relato, confirmação, enviado, detalhe), a troca de setor
e o logout. **Criam chamados de verdade** no banco local.

## Estrutura

```
lib/
  main.dart            bootstrap: env, locale pt-BR, injeções, DevicePreview (debug)
  src/
    app.dart           MaterialApp
    core/              config, network, router, styles, utils, errors, widgets
    shared/            dados/entidades usados por mais de uma feature
    features/<feature>/
      data/            datasources (Dio), models, repositories (impl)
      domain/          entities, repositories (contratos)
      presentation/    cubit, pages, widgets
```

- Estado com `flutter_bloc` (Cubit), injeção com `get_it` (`sl`).
- Textos só em pt-BR, centralizados em `lib/src/core/l10n/app_strings.dart`.

## Rede e sessão

- `ApiClient` (`lib/src/core/network/api_client.dart`, no `get_it`) é o único cliente
  HTTP. Os métodos `get/post/patch/put/delete` devolvem o `data` já desembrulhado do
  envelope `{success, data}` e lançam `AppFailure` (`lib/src/core/errors/`).
- A sessão usa os cookies httpOnly da API (`access_token`, `refresh_token`,
  `XSRF-TOKEN`), guardados num jar persistente. O header `x-xsrf-token` é enviado
  sozinho em POST/PUT/PATCH/DELETE.
- Em `401`, o cliente chama `POST /auth/refresh` uma vez (inclusive com requisições
  concorrentes) e repete a requisição. Se o refresh for recusado, o jar é limpo e
  `SessionEventBus` emite `SessionExpired`.
- Em debug, o log (`developer.log`, nome `http`) mostra só método, caminho, status e
  duração. Nunca mostra headers nem corpos.
- Em dev a API precisa de `AUTH_COOKIE_SECURE=false`, porque cookies `secure` não
  trafegam em HTTP.

## Push notifications (FCM)

O código está pronto (`lib/src/features/push/`), mas **fica desligado até o Firebase
ser configurado**: sem a configuração nativa, `createPushMessaging()` devolve um
serviço inativo e o app funciona normalmente sem push.

Para ativar:

1. Crie os projetos Firebase (dev e prod) e registre os apps Android
   (`br.com.sinaliza.app`) e iOS (mesmo bundle id).
2. Na pasta `mobile/`, rode `flutterfire configure`. Ele gera o
   `google-services.json` e o `GoogleService-Info.plist` e aplica o plugin
   `com.google.gms.google-services` no Gradle. O app inicializa o Firebase pela
   configuração nativa, então não é preciso alterar código.
3. iOS (Xcode, target Runner → Signing & Capabilities): adicione **Push Notifications**
   (o `UIBackgroundModes/remote-notification` já está no `Info.plist`) e envie a
   **chave APNs** no console do Firebase.
4. Teste com uma mensagem do console do Firebase usando o `data`
   `{ "ticket_id": "<uuid>", "protocol": "SIN-1042", "type": "TICKET_RESOLVED" }`.

O que o app faz:

- Depois do login (ou da sessão restaurada), explica e pede a permissão **uma vez**,
  pega o token e registra em `POST /devices/push-token`. O token renovado é registrado
  de novo. Falhas não bloqueiam o app e são tentadas de novo no próximo login.
- No logout, remove o token (`DELETE /devices/push-token`) antes do `/auth/logout`.
- Com o app aberto: notificação local no canal "Chamados" (Android; no iOS o banner
  é do sistema). Recarrega o histórico (A.7) e o detalhe (A.6) daquele chamado.
- Tocar no push abre o A.6. Sem sessão, guarda o destino e abre depois do login.

**Dependência de backend:** a API só armazena o token. O envio para o FCM ainda não
existe (`TODO(push-dispatch)` em `device-tokens.repository.ts`). Enquanto isso, o
histórico da A.7 funciona pela API.

**Limitação:** se a sessão **expirar** (em vez de logout), o token continua associado
no servidor, porque a remoção exige sessão válida. Ele é substituído no próximo login
(a API faz upsert).

## Design system

- Tema em `lib/src/core/styles/`: paleta da marca (a mesma do portal web), Material 3,
  Inter no corpo e Manrope nos títulos (fontes em `assets/fonts`, licença OFL).
- Nas telas, use `Theme.of(context)`, `context.colors`, `context.textStyles` e
  `context.appColors` (cores semânticas). Não defina cores nem estilos soltos.
- Componentes base em `lib/src/core/widgets/` (`AppButton`, `AppTextField`,
  `AppSelectField`, `LoadingView`, `ErrorView`, `EmptyView`, `ProtocolText`,
  `AppSnackbar`) e `TicketStatusChip` em `lib/src/shared/presentation/widgets/`.
- **Catálogo de componentes (só debug):** botão flutuante na tela de login ou rota
  `/catalog`.

Identificadores do app: `br.com.sinaliza.app` (Android `applicationId` e iOS bundle id).
