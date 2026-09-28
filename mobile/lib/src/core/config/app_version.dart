import 'package:package_info_plus/package_info_plus.dart';

/// Versão do app para exibir (ex.: rodapé do Perfil, útil para suporte).
abstract interface class AppVersionProvider {
  /// Ex.: `1.0.0 (1)` (versão + número do build).
  Future<String> label();
}

class PackageInfoVersionProvider implements AppVersionProvider {
  String? _cached;

  @override
  Future<String> label() async {
    final cached = _cached;
    if (cached != null) return cached;
    final info = await PackageInfo.fromPlatform();
    final build = info.buildNumber.isEmpty ? '' : ' (${info.buildNumber})';
    return _cached = '${info.version}$build';
  }
}
