import 'dart:async';

import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/utils/formatters/text_normalizer.dart';
import 'package:mobile/src/core/utils/memory_cache.dart';
import 'package:mobile/src/features/reference_data/data/datasources/reference_data_remote_datasource.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';

/// Validade do cache de locais e setores.
const referenceDataTtl = Duration(minutes: 10);

/// Ordem alfabética pt-BR sem diferenciar acentos/maiúsculas
/// ("Área" fica junto de "Arquivo", não depois do "Z").
int compareNames(String a, String b) {
  final byNormalized = normalizeForSearch(a).compareTo(normalizeForSearch(b));
  return byNormalized != 0 ? byNormalized : a.compareTo(b);
}

/// Base comum: cache em memória limpo quando a sessão termina.
abstract class _SessionCachedRepository<T> {
  _SessionCachedRepository({
    required SessionEventBus sessionEvents,
    DateTime Function()? clock,
  }) : cache = MemoryCache<T>(ttl: referenceDataTtl, clock: clock) {
    _subscription = sessionEvents.events.listen((event) {
      if (event is SessionEnded || event is SessionExpired) cache.clear();
    });
  }

  final MemoryCache<T> cache;
  late final StreamSubscription<SessionEvent> _subscription;

  Future<T> load(
    Future<T> Function() fetch, {
    required bool forceRefresh,
  }) async {
    try {
      return await cache.get(fetch, forceRefresh: forceRefresh);
    } on FormatException {
      throw const UnknownFailure();
    }
  }

  Future<void> dispose() => _subscription.cancel();
}

class LocationsRepositoryImpl extends _SessionCachedRepository<List<Building>>
    implements LocationsRepository {
  LocationsRepositoryImpl(
    this._remote, {
    required super.sessionEvents,
    super.clock,
  });

  final ReferenceDataRemoteDataSource _remote;

  @override
  Future<List<Building>> getBuildings({bool forceRefresh = false}) {
    return load(_fetch, forceRefresh: forceRefresh);
  }

  Future<List<Building>> _fetch() async {
    final buildings = await _remote.fetchBuildings();
    if (buildings.isEmpty) {
      // Não entra no cache: quando a administração cadastrar, aparece.
      throw const ConfigurationFailure(AppStrings.noLocationsConfigured);
    }
    final sorted = [
      for (final building in buildings)
        Building(
          id: building.id,
          name: building.name,
          environments: List<Environment>.unmodifiable(
            <Environment>[...building.environments]
              ..sort((a, b) => compareNames(a.name, b.name)),
          ),
        ),
    ]..sort((a, b) => compareNames(a.name, b.name));
    return List<Building>.unmodifiable(sorted);
  }
}

class SectorsRepositoryImpl extends _SessionCachedRepository<List<SectorRef>>
    implements SectorsRepository {
  SectorsRepositoryImpl(
    this._remote, {
    required super.sessionEvents,
    super.clock,
  });

  final ReferenceDataRemoteDataSource _remote;

  @override
  Future<List<SectorRef>> getSectors({bool forceRefresh = false}) {
    return load(_fetch, forceRefresh: forceRefresh);
  }

  Future<List<SectorRef>> _fetch() async {
    final sectors = await _remote.fetchSectors();
    if (sectors.isEmpty) {
      throw const ConfigurationFailure(AppStrings.noSectorsConfigured);
    }
    final sorted = <SectorRef>[...sectors]
      ..sort((a, b) => compareNames(a.name, b.name));
    return List<SectorRef>.unmodifiable(sorted);
  }
}
