import 'dart:io';
import 'dart:math' as math;

import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/new_report/data/datasources/classification_remote_datasource.dart';
import 'package:mobile/src/features/new_report/data/repositories/classification_repository_impl.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';

import '../../core/network/fake_api.dart';
import '../../fixtures/fixture_reader.dart';

/// Mesma fórmula do plugin (`BitmapCompressExt.calcScale`).
(int, int) pluginOutput(int w, int h, int minSide) {
  final scale = math.max(1.0, math.min(w / minSide, h / minSide));
  return ((w / scale).round(), (h / scale).round());
}

void main() {
  group('pasta das fotos do relato', () {
    late Directory dir;
    final now = DateTime(2026, 9, 27, 12);

    setUp(() => dir = Directory.systemTemp.createTempSync('report_photos'));
    tearDown(() => dir.deleteSync(recursive: true));

    File photo(String name, {required DateTime modified}) =>
        File('${dir.path}/$name')
          ..writeAsBytesSync([1, 2, 3])
          ..setLastModifiedSync(modified);

    test('limpeza apaga só as sobras com mais de 1 dia', () async {
      final old = photo(
        'antiga.jpg',
        modified: now.subtract(const Duration(days: 2)),
      );
      final recent = photo(
        'recente.jpg',
        modified: now.subtract(const Duration(hours: 1)),
      );

      await ImageCompressPhotoProcessor(now: () => now).purgeStale(dir);

      expect(old.existsSync(), isFalse);
      expect(recent.existsSync(), isTrue);
    });

    test('discard apaga a foto e tolera arquivo já removido', () async {
      final file = photo('foto.jpg', modified: now);
      final processor = ImageCompressPhotoProcessor();
      final reportPhoto = ReportPhoto(path: file.path, sizeInBytes: 3);

      await processor.discard(reportPhoto);
      expect(file.existsSync(), isFalse);

      await processor.discard(reportPhoto); // não lança
    });
  });

  group('compressionMinSide (lado maior ≤ 1920)', () {
    for (final (w, h) in [
      (4000, 3000), // 12 MP paisagem
      (3000, 4000), // 12 MP retrato
      (4032, 3024), // iPhone 12 MP
      (8000, 2000), // panorâmica
      (1920, 1080),
      (1000, 800), // já pequena
    ]) {
      test('${w}x$h', () {
        final minSide = compressionMinSide(width: w, height: h);
        final (outW, outH) = pluginOutput(w, h, minSide);
        final longer = math.max(outW, outH);

        expect(longer, lessThanOrEqualTo(1920));
        if (math.max(w, h) > 1920) {
          expect(longer, greaterThanOrEqualTo(1918)); // sem encolher demais
        } else {
          expect((outW, outH), (w, h)); // não amplia nem reduz
        }
        // Proporção mantida.
        expect(outW / outH, closeTo(w / h, 0.01));
      });
    }

    test('rotação EXIF não muda o resultado (mesmo valor nos dois lados)', () {
      expect(
        compressionMinSide(width: 4000, height: 3000),
        compressionMinSide(width: 3000, height: 4000),
      );
    });
  });

  group('classificação', () {
    late FakeSinalizaApi api;
    late SessionEventBus events;
    late ClassificationRepositoryImpl repository;

    setUp(() {
      api = FakeSinalizaApi();
      events = SessionEventBus();
      repository = ClassificationRepositoryImpl(
        ClassificationRemoteDataSource(
          ApiClient(
            baseUrl: baseUrl,
            cookieJar: CookieJar(),
            sessionEvents: events,
            httpClientAdapter: api,
            enableLogging: false,
          ),
        ),
      );
      api.routes['POST /classification/preview'] = (_) =>
          FakeReply.ok(fixture('api/classification_preview'));
    });

    tearDown(() => events.dispose());

    test('payload contém apenas a descrição (RB-02)', () async {
      final result = await repository.preview('O projetor não liga');

      final request = api.requests.single;
      expect(request.uri.path, '/api/v1/classification/preview');
      expect(request.data, {'description': 'O projetor não liga'});
      expect(result.automaticSector.name, 'TI');
      expect(result.confidence, 0.87);
    });

    test('erro da API vira AppFailure', () {
      api.routes['POST /classification/preview'] = (_) =>
          FakeReply.error(503, 'Classificador indisponível.');
      expect(
        repository.preview('x'),
        throwsA(
          isA<ServerFailure>().having(
            (f) => f.message,
            'message',
            'Classificador indisponível.',
          ),
        ),
      );
    });
  });
}
