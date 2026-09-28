import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';

/// Prédios e ambientes (tela A.3). Lança só `AppFailure`; lista vazia vira
/// `ConfigurationFailure`.
abstract interface class LocationsRepository {
  /// Em ordem alfabética (pt-BR, sem diferenciar acentos), inclusive os
  /// ambientes de cada prédio. Cache de sessão com validade curta.
  Future<List<Building>> getBuildings({bool forceRefresh = false});
}

/// Setores (tela A.4). Lança só `AppFailure`; lista vazia vira
/// `ConfigurationFailure`.
abstract interface class SectorsRepository {
  /// Em ordem alfabética (pt-BR, sem diferenciar acentos).
  Future<List<SectorRef>> getSectors({bool forceRefresh = false});
}
