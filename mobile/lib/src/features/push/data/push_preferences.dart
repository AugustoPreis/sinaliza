import 'package:shared_preferences/shared_preferences.dart';

/// O que o usuário respondeu à explicação sobre notificações (pedida uma vez,
/// depois do login).
enum PushPermissionChoice { unknown, accepted, declined }

class PushPreferences {
  PushPreferences(this._prefs);

  final SharedPreferences _prefs;

  static const _key = 'push_permission_choice';

  PushPermissionChoice get choice => PushPermissionChoice.values.firstWhere(
    (value) => value.name == _prefs.getString(_key),
    orElse: () => PushPermissionChoice.unknown,
  );

  Future<void> setChoice(PushPermissionChoice choice) =>
      _prefs.setString(_key, choice.name);
}
