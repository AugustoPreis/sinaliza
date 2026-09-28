import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';

/// Jar de cookies persistido no diretório de suporte do app, para a sessão
/// sobreviver a fechar o app. Cookies expirados são descartados na leitura.
Future<PersistCookieJar> createPersistentCookieJar() async {
  final dir = await getApplicationSupportDirectory();
  return PersistCookieJar(storage: FileStorage('${dir.path}/.cookies/'));
}
