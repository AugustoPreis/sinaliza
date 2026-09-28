import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';

abstract final class SectorRefModel {
  static SectorRef fromJson(Json json) =>
      SectorRef(id: json.str('id'), name: json.str('name'));

  /// `GET /sectors` -> `{ items: [...] }`.
  static List<SectorRef> listFromJson(Json json) =>
      json.list('items', fromJson);
}

abstract final class LocationRefModel {
  static LocationRef fromJson(Json json) =>
      LocationRef(id: json.str('id'), name: json.str('name'));
}

abstract final class BuildingModel {
  static Building fromJson(Json json) {
    return Building(
      id: json.str('id'),
      name: json.str('name'),
      environments: json.list(
        'environments',
        (env) => Environment(id: env.str('id'), name: env.str('name')),
      ),
    );
  }

  /// `GET /locations` -> `{ buildings: [...] }`.
  static List<Building> listFromJson(Json json) =>
      json.list('buildings', fromJson);
}

abstract final class ClassificationResultModel {
  static ClassificationResult fromJson(Json json) {
    return ClassificationResult(
      automaticSector: SectorRefModel.fromJson(json.obj('automatic_sector')),
      confidence: json.doubleOrNull('confidence'),
    );
  }
}
