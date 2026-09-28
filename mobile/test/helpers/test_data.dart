import 'package:mobile/src/shared/domain/entities/user.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';

User buildUser({
  List<String> permissions = const ['tickets:create', 'tickets:read'],
  String status = 'ACTIVE',
  String name = 'Maria Silva',
}) {
  return User(
    uuid: 'user-1',
    email: 'maria@instituicao.edu.br',
    name: name,
    institutionalLink: InstitutionalLink.student,
    status: status,
    roles: const [UserRole(uuid: 'role-1', name: 'REQUESTER')],
    permissions: permissions,
  );
}

final requester = buildUser();
final sectorStaff = buildUser(permissions: const ['tickets:read']);
