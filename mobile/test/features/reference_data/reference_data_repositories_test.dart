import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/reference_data/data/datasources/reference_data_remote_datasource.dart';
import 'package:mobile/src/features/reference_data/data/repositories/reference_data_repositories_impl.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mocktail/mocktail.dart';

class MockReferenceDataRemoteDataSource extends Mock
    implements ReferenceDataRemoteDataSource {}

void main() {
  late MockReferenceDataRemoteDataSource remote;
  late SessionEventBus events;
  late DateTime now;

  const buildings = [
    Building(
      id: 'b2',
      name: 'Prédio da Reitoria',
      environments: [
        Environment(id: 'e3', name: 'Sala 2'),
        Environment(id: 'e4', name: 'Auditório'),
      ],
    ),
    Building(id: 'b3', name: 'biblioteca Central', environments: []),
    Building(
      id: 'b1',
      name: 'Área de Convivência',
      environments: [Environment(id: 'e1', name: 'Cantina')],
    ),
  ];

  const sectors = [
    SectorRef(id: 's1', name: 'TI'),
    SectorRef(id: 's2', name: 'Manutenção Predial'),
    SectorRef(id: 's3', name: 'Éticas e Ouvidoria'),
    SectorRef(id: 's4', name: 'Limpeza'),
  ];

  setUp(() {
    remote = MockReferenceDataRemoteDataSource();
    events = SessionEventBus();
    now = DateTime(2026, 9, 1, 10);
  });

  tearDown(() => events.dispose());

  group('LocationsRepository', () {
    late LocationsRepositoryImpl repository;

    setUp(() {
      repository = LocationsRepositoryImpl(
        remote,
        sessionEvents: events,
        clock: () => now,
      );
    });

    tearDown(() => repository.dispose());

    test('ordena prédios e ambientes (pt-BR, sem acentos)', () async {
      when(() => remote.fetchBuildings()).thenAnswer((_) async => buildings);

      final result = await repository.getBuildings();

      expect(result.map((b) => b.name), [
        'Área de Convivência',
        'biblioteca Central',
        'Prédio da Reitoria',
      ]);
      expect(result.last.environments.map((e) => e.name), [
        'Auditório',
        'Sala 2',
      ]);
      expect(() => result.add(buildings.first), throwsUnsupportedError);
    });

    test('abrir A.3 duas vezes na sessão faz uma chamada só', () async {
      when(() => remote.fetchBuildings()).thenAnswer((_) async => buildings);

      await repository.getBuildings();
      now = now.add(const Duration(minutes: 5));
      await repository.getBuildings();

      verify(() => remote.fetchBuildings()).called(1);
    });

    test('depois de 10 min ou com forceRefresh busca de novo', () async {
      when(() => remote.fetchBuildings()).thenAnswer((_) async => buildings);

      await repository.getBuildings();
      await repository.getBuildings(forceRefresh: true);
      now = now.add(referenceDataTtl);
      await repository.getBuildings();

      verify(() => remote.fetchBuildings()).called(3);
    });

    test('lista vazia -> ConfigurationFailure, sem guardar no cache', () async {
      when(() => remote.fetchBuildings()).thenAnswer((_) async => []);

      await expectLater(
        repository.getBuildings(),
        throwsA(
          isA<ConfigurationFailure>().having(
            (f) => f.message,
            'message',
            AppStrings.noLocationsConfigured,
          ),
        ),
      );

      when(() => remote.fetchBuildings()).thenAnswer((_) async => buildings);
      expect(await repository.getBuildings(), hasLength(3));
    });

    test('erro de rede é repassado e não fica no cache', () async {
      when(() => remote.fetchBuildings()).thenThrow(const NetworkFailure());
      await expectLater(
        repository.getBuildings(),
        throwsA(isA<NetworkFailure>()),
      );

      when(() => remote.fetchBuildings()).thenAnswer((_) async => buildings);
      expect(await repository.getBuildings(), isNotEmpty);
      verify(() => remote.fetchBuildings()).called(2);
    });

    test('payload inválido -> UnknownFailure', () async {
      when(() => remote.fetchBuildings()).thenThrow(const FormatException());
      expect(repository.getBuildings(), throwsA(isA<UnknownFailure>()));
    });

    for (final event in [const SessionEnded(), const SessionExpired()]) {
      test('${event.runtimeType} limpa o cache', () async {
        when(() => remote.fetchBuildings()).thenAnswer((_) async => buildings);
        await repository.getBuildings();

        events.emit(event);
        await Future<void>.delayed(Duration.zero);
        await repository.getBuildings();

        verify(() => remote.fetchBuildings()).called(2);
      });
    }
  });

  group('SectorsRepository', () {
    late SectorsRepositoryImpl repository;

    setUp(() {
      repository = SectorsRepositoryImpl(
        remote,
        sessionEvents: events,
        clock: () => now,
      );
    });

    tearDown(() => repository.dispose());

    test('ordena e guarda em cache', () async {
      when(() => remote.fetchSectors()).thenAnswer((_) async => sectors);

      final result = await repository.getSectors();
      await repository.getSectors();

      expect(result.map((s) => s.name), [
        'Éticas e Ouvidoria',
        'Limpeza',
        'Manutenção Predial',
        'TI',
      ]);
      verify(() => remote.fetchSectors()).called(1);
    });

    test('lista vazia -> ConfigurationFailure', () {
      when(() => remote.fetchSectors()).thenAnswer((_) async => []);
      expect(
        repository.getSectors(),
        throwsA(
          isA<ConfigurationFailure>().having(
            (f) => f.message,
            'message',
            AppStrings.noSectorsConfigured,
          ),
        ),
      );
    });

    test('erro do servidor é repassado', () {
      when(() => remote.fetchSectors()).thenThrow(const ServerFailure());
      expect(repository.getSectors(), throwsA(isA<ServerFailure>()));
    });
  });

  test('compareNames ignora acentos e maiúsculas', () {
    final names = ['Zeladoria', 'área externa', 'Arquivo', 'Ótica']
      ..sort(compareNames);
    expect(names, ['área externa', 'Arquivo', 'Ótica', 'Zeladoria']);
  });
}
