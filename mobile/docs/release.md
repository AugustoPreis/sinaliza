# Release e distribuição do piloto

Como gerar e distribuir builds do app do solicitante. Para rodar em desenvolvimento,
veja o [README](../README.md).

## Pré-requisitos (uma vez)

| Item | Onde | Situação |
|------|------|----------|
| API do piloto em **HTTPS** | infra | Obrigatório: o build de release recusa `http://` (cookies `secure`). |
| `env/prod.json` com a URL do piloto | `mobile/env/` (fora do git) | Copiar de `prod.example.json`. |
| Keystore Android de upload | fora do repositório | Ver "Assinatura Android". |
| Time Apple + bundle id `br.com.sinaliza.app` | Apple Developer | Assinatura e TestFlight. |
| Projeto Firebase | Firebase | Só para push e App Distribution (ver README, "Push"). |

## Versão

`version: x.y.z+build` no `pubspec.yaml`:

- `build` (inteiro) **sempre sobe** a cada build distribuído. Lojas e App
  Distribution rejeitam builds repetidos.
- `x.y.z`: `z` para correções, `y` para funcionalidades novas do piloto.

A versão aparece no rodapé do Perfil (A.8), o que ajuda no suporte.

## Assinatura Android

1. Gere a chave de upload (guarde a senha num cofre, **nunca** no git):
   ```bash
   keytool -genkey -v -keystore ~/sinaliza-upload.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias upload
   ```
2. Crie `mobile/android/key.properties`, já ignorado pelo git:
   ```properties
   storeFile=C:/caminho/para/sinaliza-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```

Sem `key.properties`, o release é assinado com a chave de debug. O Gradle avisa
("key.properties ausente"). Isso serve para instalar localmente, mas não serve para
a Play Store.

## Gerar os builds

Na pasta `mobile/`:

```bash
flutter clean && flutter pub get
flutter analyze && flutter test

# Android: AAB (Play Console) ou APK (App Distribution / instalação direta)
flutter build appbundle --release --dart-define-from-file=env/prod.json
flutter build apk --release --dart-define-from-file=env/prod.json

# iOS (em um Mac, com o time de assinatura configurado no Xcode)
flutter build ipa --release --dart-define-from-file=env/prod.json
```

Saídas: `build/app/outputs/bundle/release/app-release.aab`,
`build/app/outputs/flutter-apk/app-release.apk` e `build/ios/ipa/*.ipa`.

## Distribuir

- **Android, Firebase App Distribution** (mais simples para o piloto): console do
  Firebase → App Distribution → envie o APK → grupo "Piloto". Os participantes
  recebem um e-mail com o link.
  - Alternativa: Play Console → Teste interno (AAB), com a lista de e-mails dos
    participantes.
- **iOS, TestFlight**: envie o `.ipa` pelo Transporter (ou Xcode → Organizer) →
  App Store Connect → TestFlight → testadores externos (a primeira versão passa por
  revisão da Apple, cerca de 1 dia).

Envie aos participantes o [guia rápido](guia-piloto.md).

## Ambientes (dev e prod)

Hoje os ambientes são escolhidos em tempo de build por `--dart-define-from-file`
(`env/dev.json`, `env/dev.ios.json`, `env/prod.json`): URL da API e nome do ambiente.
O tráfego HTTP sem TLS só é liberado no build de debug
(`android/app/src/debug/AndroidManifest.xml`).

**Flavors nativos ainda não foram criados** (decisão da task 17). Eles obrigariam
`--flavor` em todo `flutter run` e, no iOS, exigem schemes criados no Xcode. O único
ganho agora seria separar o projeto Firebase por ambiente, que ainda não existe.
Quando o Firebase for configurado com projetos separados:

1. Android: `productFlavors { dev { applicationIdSuffix = ".dev" } prod {} }` em
   `android/app/build.gradle.kts` e um `google-services.json` em `android/app/src/dev/` e
   outro em `android/app/src/prod/`.
2. iOS: schemes `dev` e `prod` no Xcode, cada um copiando o seu
   `GoogleService-Info.plist`.
3. Rodar com `flutter run --flavor dev --dart-define-from-file=env/dev.json`.

## Antes de distribuir (checklist curto)

- [ ] `pubspec.yaml`: build incrementado.
- [ ] `flutter analyze` e `flutter test` verdes; testes de integração contra a API do
      piloto (ver README, "Testes de integração").
- [ ] Build instalado num Android e num iPhone reais: login, novo relato com foto,
      detalhe, notificações e sair.
- [ ] URL de produção abre no navegador do celular (HTTPS válido).
