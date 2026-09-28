import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/data/models/reference_models.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';

/// `GET /locations` e `GET /sectors`. Lança `AppFailure` ou `FormatException`.
class ReferenceDataRemoteDataSource {
  ReferenceDataRemoteDataSource(this._client);

  final ApiClient _client;

  static const locationsPath = '/locations';
  static const sectorsPath = '/sectors';

  /// Árvore completa (prédios com ambientes) numa chamada só.
  Future<List<Building>> fetchBuildings() async {
    final data = await _client.get<Object?>(locationsPath);
    return BuildingModel.listFromJson(asJson(data));
  }

  Future<List<SectorRef>> fetchSectors() async {
    final data = await _client.get<Object?>(sectorsPath);
    return SectorRefModel.listFromJson(asJson(data));
  }
}
