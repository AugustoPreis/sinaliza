// Captura payloads reais da API local para test/fixtures/api/.
//
// Uso (na pasta mobile/):
//   dart run tool/capture_fixtures.dart \
//     --api http://localhost:3000/api/v1 --login aluno@x.edu.br --password ...
//
// Grava só o `data` de cada resposta (sem o envelope). Revise o diff antes de
// commitar: nomes e e-mails reais não devem ir para o repositório.
// ignore_for_file: avoid_print

import 'dart:convert';
import 'dart:io';

Future<void> main(List<String> args) async {
  final options = _parseArgs(args);
  final api = options['api'] ?? 'http://localhost:3000/api/v1';
  final login = options['login'];
  final password = options['password'];
  if (login == null || password == null) {
    stderr.writeln('Informe --login e --password.');
    exit(64);
  }

  final client = _Client(api);
  final outDir = Directory('test/fixtures/api')..createSync(recursive: true);

  Future<Object?> save(String name, Object? data) async {
    final file = File('${outDir.path}/$name.json');
    await file.writeAsString(
      '${const JsonEncoder.withIndent('  ').convert(data)}\n',
    );
    print('ok  $name.json');
    return data;
  }

  await save(
    'auth_login',
    await client.send('POST', '/auth/login', {
      'identifier': login,
      'password': password,
    }),
  );
  await save('auth_me', await client.send('GET', '/auth/me'));
  await save('locations', await client.send('GET', '/locations'));
  await save('sectors', await client.send('GET', '/sectors'));
  await save(
    'classification_preview',
    await client.send('POST', '/classification/preview', {
      'description': 'O projetor da sala 101 não liga.',
    }),
  );

  final tickets =
      await save('tickets_list', await client.send('GET', '/tickets?page=1'))
          as Map<String, dynamic>;
  final items = tickets['items'] as List<dynamic>;
  if (items.isNotEmpty) {
    final id = (items.first as Map<String, dynamic>)['id'];
    await save('ticket_detail', await client.send('GET', '/tickets/$id'));
  } else {
    print('--  ticket_detail.json (usuário sem chamados, não capturado)');
  }

  await save('notifications', await client.send('GET', '/notifications'));
  print(
    '\nticket_created.json não é capturado (criaria um chamado real). '
    'Mantenha o fixture montado a partir do DTO.',
  );
  client.close();
}

Map<String, String> _parseArgs(List<String> args) {
  final result = <String, String>{};
  for (var i = 0; i + 1 < args.length; i += 2) {
    result[args[i].replaceFirst('--', '')] = args[i + 1];
  }
  return result;
}

/// Cliente mínimo com cookies de sessão e CSRF, como o app faz.
class _Client {
  _Client(this.baseUrl);

  final String baseUrl;
  final HttpClient _http = HttpClient();
  final Map<String, String> _cookies = {};

  Future<Object?> send(String method, String path, [Object? body]) async {
    final request = await _http.openUrl(method, Uri.parse('$baseUrl$path'));
    request.headers
      ..set('Accept', 'application/json')
      ..set('Accept-Language', 'pt-BR');
    if (_cookies.isNotEmpty) {
      request.headers.set(
        'Cookie',
        _cookies.entries.map((e) => '${e.key}=${e.value}').join('; '),
      );
    }
    final xsrf = _cookies['XSRF-TOKEN'];
    if (method != 'GET' && xsrf != null) {
      request.headers.set('x-xsrf-token', xsrf);
    }
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));
    }

    final response = await request.close();
    for (final cookie in response.cookies) {
      _cookies[cookie.name] = cookie.value;
    }
    final text = await response.transform(utf8.decoder).join();
    if (response.statusCode >= 400) {
      throw HttpException('$method $path -> ${response.statusCode}: $text');
    }
    final json = jsonDecode(text) as Map<String, dynamic>;
    return json['data'];
  }

  void close() => _http.close();
}
