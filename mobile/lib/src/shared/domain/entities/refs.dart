import 'package:equatable/equatable.dart';

/// Referência a um setor `{ id, name }` (id é o UUID do setor).
class SectorRef extends Equatable {
  const SectorRef({required this.id, required this.name});

  final String id;
  final String name;

  @override
  List<Object?> get props => [id, name];
}

/// Referência a um prédio ou ambiente `{ id, name }` (detalhe do chamado).
class LocationRef extends Equatable {
  const LocationRef({required this.id, required this.name});

  final String id;
  final String name;

  @override
  List<Object?> get props => [id, name];
}
