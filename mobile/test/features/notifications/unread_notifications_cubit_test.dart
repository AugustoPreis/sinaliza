import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/notifications/presentation/cubit/unread_notifications_cubit.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';

void main() {
  late MockNotificationsRepository repository;
  late UnreadNotificationsCubit cubit;

  setUp(() {
    repository = MockNotificationsRepository();
    cubit = UnreadNotificationsCubit(repository: repository);
  });

  tearDown(() => cubit.close());

  test('refresh traz a contagem da API', () async {
    when(repository.getUnreadCount).thenAnswer((_) async => 4);

    await cubit.refresh();

    expect(cubit.state, 4);
  });

  test('sem rede mantém o último valor', () async {
    when(repository.getUnreadCount).thenAnswer((_) async => 2);
    await cubit.refresh();
    when(repository.getUnreadCount).thenThrow(const NetworkFailure());

    await cubit.refresh();

    expect(cubit.state, 2);
  });

  test('markAllRead zera na hora e avisa a API', () async {
    when(repository.getUnreadCount).thenAnswer((_) async => 3);
    await cubit.refresh();
    final api = Completer<void>();
    when(repository.markAllRead).thenAnswer((_) => api.future);

    final done = cubit.markAllRead();
    expect(cubit.state, 0);

    api.complete();
    await done;
    verify(repository.markAllRead).called(1);
  });

  test('se markAllRead falhar, volta ao valor real', () async {
    when(repository.markAllRead).thenThrow(const NetworkFailure());
    when(repository.getUnreadCount).thenAnswer((_) async => 5);

    await cubit.markAllRead();

    expect(cubit.state, 5);
  });

  test('contagem antiga não desfaz o markAllRead feito depois', () async {
    final slow = Completer<int>();
    when(repository.getUnreadCount).thenAnswer((_) => slow.future);
    when(repository.markAllRead).thenAnswer((_) async {});

    final pending = cubit.refresh();
    await cubit.markAllRead();
    slow.complete(7); // resposta de antes de marcar como lidas
    await pending;

    expect(cubit.state, 0);
  });
}
