import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_navigator.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/push/application/push_coordinator.dart';
import 'package:mobile/src/features/push/data/device_token_repository.dart';
import 'package:mobile/src/features/push/data/local_notifications.dart';
import 'package:mobile/src/features/push/data/push_preferences.dart';
import 'package:mobile/src/features/push/domain/push_messaging.dart';
import 'package:mobile/src/features/tickets/domain/ticket_changed_signal.dart';

/// [messaging] vem de `createPushMessaging()` (Firebase, ou indisponível se
/// o projeto ainda não foi configurado).
void initPushInjections(PushMessaging messaging) {
  sl
    ..registerSingleton<PushMessaging>(messaging)
    ..registerLazySingleton<LocalNotifier>(FlutterLocalNotifier.new)
    ..registerLazySingleton<DeviceTokenRepository>(
      () => DeviceTokenRepository(sl()),
    )
    ..registerLazySingleton<PushPreferences>(() => PushPreferences(sl()))
    ..registerLazySingleton<TicketChangedSignal>(
      TicketChangedSignal.new,
      dispose: (signal) => signal.dispose(),
    )
    ..registerLazySingleton<PushCoordinator>(
      () => PushCoordinator(
        messaging: sl(),
        localNotifier: sl(),
        tokens: sl(),
        preferences: sl(),
        notificationsSignal: sl(),
        ticketSignal: sl(),
        openTicket: (ticketId) => _openTicket(sl(), ticketId),
        confirmPermissionRationale: () => _confirmRationale(sl()),
      ),
      dispose: (coordinator) => coordinator.dispose(),
    );
}

/// Abre o A.6 por cima da pilha atual. Espera o fim do frame para não
/// competir com a troca de pilha do login -> home.
Future<void> _openTicket(AppNavigator navigator, String ticketId) async {
  await WidgetsBinding.instance.endOfFrame;
  await navigator.push<void>(
    AppRouterEnum.ticketDetail.route,
    arguments: ticketId,
  );
}

/// Explicação curta antes do pedido de permissão do sistema.
Future<bool> _confirmRationale(AppNavigator navigator) async {
  await WidgetsBinding.instance.endOfFrame;
  final context = navigator.navigatorKey.currentContext;
  if (context == null || !context.mounted) return false;
  final accepted = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      icon: const Icon(Icons.notifications_active_outlined),
      title: const Text(AppStrings.pushRationaleTitle),
      content: const Text(AppStrings.pushRationaleMessage),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text(AppStrings.pushRationaleDecline),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text(AppStrings.pushRationaleAccept),
        ),
      ],
    ),
  );
  return accepted ?? false;
}
