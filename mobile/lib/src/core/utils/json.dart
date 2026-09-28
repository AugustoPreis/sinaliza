/// Objeto JSON decodificado pelo Dio.
typedef Json = Map<String, dynamic>;

/// Leitura tipada de JSON. Campo obrigatório ausente ou com tipo errado lança
/// [FormatException] com o nome do campo (vira `UnknownFailure` no
/// repositório); campos opcionais devolvem `null`.
extension JsonRead on Json {
  String str(String key) {
    final value = this[key];
    if (value is String) return value;
    throw _invalid(key, 'texto');
  }

  String? strOrNull(String key) {
    final value = this[key];
    return value is String ? value : null;
  }

  bool boolean(String key) {
    final value = this[key];
    if (value is bool) return value;
    throw _invalid(key, 'booleano');
  }

  int integer(String key) {
    final value = this[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    throw _invalid(key, 'número');
  }

  double? doubleOrNull(String key) {
    final value = this[key];
    return value is num ? value.toDouble() : null;
  }

  /// Data ISO 8601 (UTC na API) convertida para o fuso local.
  DateTime date(String key) {
    final raw = str(key);
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) throw _invalid(key, 'data ISO 8601');
    return parsed.toLocal();
  }

  Json obj(String key) {
    final value = this[key];
    if (value is Map) return value.cast<String, dynamic>();
    throw _invalid(key, 'objeto');
  }

  Json? objOrNull(String key) {
    final value = this[key];
    if (value == null) return null;
    if (value is Map) return value.cast<String, dynamic>();
    throw _invalid(key, 'objeto ou null');
  }

  /// Lista de objetos. Ausente ou `null` vira lista vazia.
  List<T> list<T>(String key, T Function(Json json) parse) {
    final value = this[key];
    if (value == null) return const [];
    if (value is! List) throw _invalid(key, 'lista');
    return List.unmodifiable(
      value.map((item) {
        if (item is Map) return parse(item.cast<String, dynamic>());
        throw _invalid(key, 'lista de objetos');
      }),
    );
  }

  /// Lista de textos. Ausente ou `null` vira lista vazia.
  List<String> strings(String key) {
    final value = this[key];
    if (value == null) return const [];
    if (value is! List) throw _invalid(key, 'lista');
    return List.unmodifiable(value.whereType<String>());
  }

  FormatException _invalid(String key, String expected) => FormatException(
    'Campo "$key" ausente ou inválido (esperado: $expected).',
  );
}

/// Converte o `data` desembrulhado pelo `ApiClient` em [Json].
Json asJson(Object? data) {
  if (data is Map) return data.cast<String, dynamic>();
  throw const FormatException('Resposta da API não é um objeto JSON.');
}
