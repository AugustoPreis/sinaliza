import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile/src/features/push/domain/push_messaging.dart';
import 'package:mobile/src/features/push/domain/push_payload.dart';

/// Handler de push com o app em segundo plano/fechado. Precisa ser função
/// top-level. Com `notification` no payload o próprio sistema exibe o
/// aviso; aqui só garantimos o Firebase inicializado.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

/// Inicializa o Firebase a partir da configuração nativa
/// (`google-services.json` / `GoogleService-Info.plist`, gerados pelo
/// `flutterfire configure`). Sem ela, devolve [UnavailablePushMessaging] e o
/// app segue sem push.
Future<PushMessaging> createPushMessaging() async {
  if (kIsWeb || !(Platform.isAndroid || Platform.isIOS)) {
    return const UnavailablePushMessaging();
  }
  try {
    await Firebase.initializeApp();
  } on Object catch (error) {
    debugPrint('Push desativado: Firebase não configurado ($error).');
    return const UnavailablePushMessaging();
  }

  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  final messaging = FirebaseMessaging.instance;
  // iOS: o sistema mostra o banner mesmo com o app aberto (no Android é a
  // notificação local que faz isso).
  await messaging.setForegroundNotificationPresentationOptions(
    alert: true,
    badge: true,
    sound: true,
  );
  return FirebasePushMessaging(messaging);
}

class FirebasePushMessaging implements PushMessaging {
  FirebasePushMessaging(this._messaging);

  final FirebaseMessaging _messaging;

  @override
  bool get isAvailable => true;

  @override
  PushPlatform? get platform => Platform.isIOS
      ? PushPlatform.ios
      : Platform.isAndroid
      ? PushPlatform.android
      : null;

  @override
  Future<bool> requestPermission() async {
    final settings = await _messaging.requestPermission();
    return switch (settings.authorizationStatus) {
      AuthorizationStatus.authorized || AuthorizationStatus.provisional => true,
      _ => false,
    };
  }

  @override
  Future<String?> getToken() => _messaging.getToken();

  @override
  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;

  @override
  Stream<PushPayload> get onForegroundMessage =>
      FirebaseMessaging.onMessage.map(_toPayload).where(_hasTicket).cast();

  @override
  Stream<PushPayload> get onMessageOpenedApp => FirebaseMessaging
      .onMessageOpenedApp
      .map(_toPayload)
      .where(_hasTicket)
      .cast();

  @override
  Future<PushPayload?> getInitialMessage() async {
    final message = await _messaging.getInitialMessage();
    return message == null ? null : _toPayload(message);
  }

  static PushPayload? _toPayload(RemoteMessage message) => PushPayload.fromData(
    message.data,
    title: message.notification?.title,
    body: message.notification?.body,
  );

  static bool _hasTicket(PushPayload? payload) => payload != null;
}
