import 'dart:convert';
import 'dart:io';

import 'package:mobile/src/core/utils/json.dart';

/// Lê `test/fixtures/<path>.json` (o `flutter test` roda na raiz do pacote).
Json fixture(String path) {
  final file = File('test/fixtures/$path.json');
  return (jsonDecode(file.readAsStringSync()) as Map).cast<String, dynamic>();
}
