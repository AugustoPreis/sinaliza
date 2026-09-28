import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/utils/memory_cache.dart';

void main() {
  late DateTime now;
  late MemoryCache<int> cache;
  late int calls;

  Future<int> load() async => ++calls;

  setUp(() {
    now = DateTime(2026, 9, 1, 10);
    calls = 0;
    cache = MemoryCache<int>(
      ttl: const Duration(minutes: 10),
      clock: () => now,
    );
  });

  test('reaproveita o valor dentro da validade', () async {
    expect(await cache.get(load), 1);
    now = now.add(const Duration(minutes: 9));
    expect(await cache.get(load), 1);
    expect(calls, 1);
  });

  test('recarrega depois da validade', () async {
    await cache.get(load);
    now = now.add(const Duration(minutes: 10));
    expect(await cache.get(load), 2);
  });

  test('forceRefresh ignora o cache', () async {
    await cache.get(load);
    expect(await cache.get(load, forceRefresh: true), 2);
  });

  test('chamadas simultâneas compartilham o carregamento', () async {
    final gate = Completer<void>();
    Future<int> slow() async {
      await gate.future;
      return ++calls;
    }

    final results = [cache.get(slow), cache.get(slow), cache.get(slow)];
    gate.complete();
    expect(await Future.wait(results), [1, 1, 1]);
    expect(calls, 1);
  });

  test('falha não fica no cache', () async {
    await expectLater(
      cache.get(() async => throw StateError('x')),
      throwsStateError,
    );
    expect(await cache.get(load), 1);
  });

  test('clear força nova carga', () async {
    await cache.get(load);
    cache.clear();
    expect(cache.hasValidValue, isFalse);
    expect(await cache.get(load), 2);
  });
}
