import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/features/push/domain/push_messaging.dart';
import 'package:mobile/src/features/push/domain/push_payload.dart';

/// Notificação local para push recebido com o app aberto (Android). No iOS
/// o banner já é exibido pelo sistema (`setForegroundNotificationPresentation
/// Options`), então não duplica.
class FlutterLocalNotifier implements LocalNotifier {
  FlutterLocalNotifier([FlutterLocalNotificationsPlugin? plugin])
    : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;

  /// Canal "Chamados" (Android 8+). Mesmo id do `default_notification_channel_id`
  /// no `AndroidManifest.xml`, usado também pelos pushes em segundo plano.
  static const channel = AndroidNotificationChannel(
    'chamados',
    AppStrings.pushChannelName,
    description: AppStrings.pushChannelDescription,
    importance: Importance.high,
  );

  /// Ícone monocromático em `android/app/src/main/res/drawable`.
  static const _androidIcon = 'ic_stat_notification';

  int _nextId = 0;

  @override
  Future<void> initialize({
    required void Function(String ticketId) onTap,
  }) async {
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings(_androidIcon),
        // Permissão é pedida pelo FirebaseMessaging, depois do login.
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (response) {
        final ticketId = response.payload;
        if (ticketId != null && ticketId.isNotEmpty) onTap(ticketId);
      },
    );
    await _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(channel);
  }

  @override
  Future<void> show(PushPayload payload) async {
    if (!Platform.isAndroid) return;
    final protocol = payload.protocol;
    await _plugin.show(
      id: _nextId++,
      title:
          payload.title ??
          (protocol == null
              ? AppStrings.appName
              : AppStrings.pushTitle(ProtocolText.format(protocol))),
      body: payload.body,
      payload: payload.ticketId,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: _androidIcon,
        ),
      ),
    );
  }
}
