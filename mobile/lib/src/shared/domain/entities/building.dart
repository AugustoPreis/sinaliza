import 'package:equatable/equatable.dart';

/// Ambiente de um prédio (sala, corredor...).
class Environment extends Equatable {
  const Environment({required this.id, required this.name});

  final String id;
  final String name;

  @override
  List<Object?> get props => [id, name];
}

/// Prédio com seus ambientes (`GET /locations` -> `buildings[]`).
class Building extends Equatable {
  const Building({
    required this.id,
    required this.name,
    required this.environments,
  });

  final String id;
  final String name;
  final List<Environment> environments;

  @override
  List<Object?> get props => [id, name, environments];
}
