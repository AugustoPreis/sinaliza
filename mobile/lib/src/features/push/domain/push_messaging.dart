import 'package:mobile/src/features/push/domain/push_payload.dart';

/// Plataforma do token, como a API espera (`EDevicePlatform`).
enum PushPlatform {
  android('ANDROID'),
  ios('IOS');

  const PushPlatform(this.apiValue);

  final String apiValue;
}

/// Serviço de push do aparelho (FCM). Abstrai o Firebase para permitir
/// testes e para o app funcionar sem ele configurado ([isAvailable]).
abstract interface class PushMessaging {
  /// `false` quando o Firebase não está configurado neste build.
  bool get isAvailable;

  PushPlatform? get platform;

  /// Pede permissão ao sistema (Android 13+ / iOS). `true` se autorizado.
  Future<bool> requestPermission();

  /// Token atual, ou `null` se indisponível (ex.: APNs ainda sem token).
  Future<String?> getToken();

  Stream<String> get onTokenRefresh;

  /// Pushes recebidos com o app em primeiro plano.
  Stream<PushPayload> get onForegroundMessage;

  /// Toques em pushes com o app em segundo plano.
  Stream<PushPayload> get onMessageOpenedApp;

  /// Push que abriu o app a partir de fechado (uma vez).
  Future<PushPayload?> getInitialMessage();
}

/// Mostra notificações locais (push em primeiro plano no Android).
abstract interface class LocalNotifier {
  Future<void> initialize({required void Function(String ticketId) onTap});

  Future<void> show(PushPayload payload);
}

/// Sem Firebase configurado: push desligado, o resto do app funciona.
class UnavailablePushMessaging implements PushMessaging {
  const UnavailablePushMessaging();

  @override
  bool get isAvailable => false;

  @override
  PushPlatform? get platform => null;

  @override
  Future<bool> requestPermission() async => false;

  @override
  Future<String?> getToken() async => null;

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();

  @override
  Stream<PushPayload> get onForegroundMessage => const Stream.empty();

  @override
  Stream<PushPayload> get onMessageOpenedApp => const Stream.empty();

  @override
  Future<PushPayload?> getInitialMessage() async => null;
}
