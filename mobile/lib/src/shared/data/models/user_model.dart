import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';

/// JSON do usuário (`MeResponseDTO`). Atenção: este DTO usa **camelCase**,
/// diferente dos DTOs de chamados.
abstract final class UserModel {
  static User fromJson(Json json) {
    return User(
      uuid: json.str('uuid'),
      email: json.str('email'),
      name: json.str('name'),
      institutionalLink: InstitutionalLink.fromApi(
        json.strOrNull('institutionalLink'),
      ),
      status: json.strOrNull('status') ?? '',
      roles: json.list(
        'roles',
        (role) => UserRole(uuid: role.str('uuid'), name: role.str('name')),
      ),
      permissions: json.strings('permissions'),
    );
  }

  /// `POST /auth/login` e `POST /auth/refresh` devolvem `{ user: {...} }`.
  static User fromLoginJson(Json json) => fromJson(json.obj('user'));
}
