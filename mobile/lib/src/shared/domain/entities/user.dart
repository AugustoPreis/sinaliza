import 'package:equatable/equatable.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';

/// Papel do usuário (`roles[]`), ex.: `REQUESTER`.
class UserRole extends Equatable {
  const UserRole({required this.uuid, required this.name});

  final String uuid;
  final String name;

  @override
  List<Object?> get props => [uuid, name];
}

/// Usuário autenticado (`GET /auth/me` e `data.user` do login/refresh).
class User extends Equatable {
  const User({
    required this.uuid,
    required this.email,
    required this.name,
    required this.institutionalLink,
    required this.status,
    required this.roles,
    required this.permissions,
  });

  /// Permissão exigida para abrir chamados (`POST /tickets`).
  static const String requesterPermission = 'tickets:create';

  final String uuid;
  final String email;
  final String name;

  /// `null` para contas sem vínculo (ex.: administrativas).
  final InstitutionalLink? institutionalLink;

  /// Ex.: `ACTIVE`, `INACTIVE`.
  final String status;
  final List<UserRole> roles;

  /// Formato `recurso:ação`, ex.: `tickets:create`.
  final List<String> permissions;

  /// Só quem pode abrir chamado usa o app do solicitante.
  bool get canUseRequesterApp => permissions.contains(requesterPermission);

  bool hasPermission(String permission) => permissions.contains(permission);

  @override
  List<Object?> get props => [
    uuid,
    email,
    name,
    institutionalLink,
    status,
    roles,
    permissions,
  ];
}
