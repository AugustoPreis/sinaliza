/// Cache em memória de um único valor, com validade ([ttl]).
///
/// - Chamadas simultâneas enquanto carrega compartilham a mesma requisição.
/// - Falhas não são guardadas: a próxima chamada tenta de novo.
class MemoryCache<T> {
  MemoryCache({required this.ttl, DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final Duration ttl;
  final DateTime Function() _clock;

  T? _value;
  DateTime? _storedAt;
  Future<T>? _inFlight;

  bool get hasValidValue {
    final storedAt = _storedAt;
    return storedAt != null && _clock().difference(storedAt) < ttl;
  }

  /// Devolve o valor em cache ou chama [load]. Com [forceRefresh] ignora o
  /// cache (mas ainda reaproveita um carregamento em andamento).
  Future<T> get(Future<T> Function() load, {bool forceRefresh = false}) {
    final inFlight = _inFlight;
    if (inFlight != null) return inFlight;
    if (!forceRefresh && hasValidValue) return Future.value(_value as T);

    final future = _load(load);
    _inFlight = future;
    return future;
  }

  Future<T> _load(Future<T> Function() load) async {
    try {
      final value = await load();
      _value = value;
      _storedAt = _clock();
      return value;
    } finally {
      _inFlight = null;
    }
  }

  void clear() {
    _value = null;
    _storedAt = null;
  }
}
