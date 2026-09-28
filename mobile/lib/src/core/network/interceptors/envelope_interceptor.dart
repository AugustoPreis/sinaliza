import 'package:dio/dio.dart';

/// Desembrulha o envelope de sucesso da API
/// (`{ success: true, data: <payload>, timestamp }`) para que os datasources
/// recebam só o `<payload>`.
///
/// Respostas binárias (`bytes`/`stream`) e corpos fora do envelope passam
/// intactos. Corpo vazio (ex.: `204 No Content`) vira `null`.
class EnvelopeInterceptor extends Interceptor {
  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    final type = response.requestOptions.responseType;
    if (type == ResponseType.bytes || type == ResponseType.stream) {
      handler.next(response);
      return;
    }

    final data = response.data;
    if (data is Map && data['success'] == true && data.containsKey('data')) {
      response.data = data['data'];
    } else if (data is String && data.isEmpty) {
      response.data = null;
    }
    handler.next(response);
  }
}
