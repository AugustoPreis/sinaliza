import 'dart:convert';
import 'dart:io';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/tickets/data/datasources/tickets_remote_datasource.dart';
import 'package:mobile/src/features/tickets/data/repositories/tickets_repository_impl.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';

import '../../core/network/fake_api.dart';
import '../../fixtures/fixture_reader.dart';

void main() {
  late FakeSinalizaApi api;
  late SessionEventBus events;
  late TicketsRepositoryImpl repository;
  late Directory tmp;

  setUp(() async {
    api = FakeSinalizaApi();
    events = SessionEventBus();
    tmp = await Directory.systemTemp.createTemp('sinaliza_test');
    repository = TicketsRepositoryImpl(
      TicketsRemoteDataSource(
        ApiClient(
          baseUrl: baseUrl,
          cookieJar: CookieJar(),
          sessionEvents: events,
          httpClientAdapter: api,
          enableLogging: false,
        ),
      ),
    );
    api.routes['POST /tickets'] = (_) =>
        FakeReply.ok(fixture('api/ticket_created'));
  });

  tearDown(() async {
    await events.dispose();
    await tmp.delete(recursive: true);
  });

  Future<ReportPhoto> photo(String name) async {
    final file = File('${tmp.path}/$name');
    await file.writeAsBytes(List.filled(1024, 7));
    return ReportPhoto(path: file.path, sizeInBytes: 1024);
  }

  NewTicketRequest request({List<ReportPhoto> photos = const []}) =>
      NewTicketRequest(
        description: 'O projetor não liga',
        buildingId: 'b-uuid',
        environmentId: 'e-uuid',
        automaticSectorId: 'sector-auto',
        confirmedSectorId: 'sector-chosen',
        photos: photos,
      );

  test('multipart com os nomes exatos da API e location em JSON', () async {
    final created = await repository.createTicket(request());

    final sent = api.requests.single;
    expect(sent.method, 'POST');
    expect(sent.uri.path, '/api/v1/tickets');
    final form = sent.data as FormData;
    final fields = Map.fromEntries(form.fields);
    expect(fields, {
      'description': 'O projetor não liga',
      'location': jsonEncode({
        'building_id': 'b-uuid',
        'environment_id': 'e-uuid',
      }),
      'automatic_sector_id': 'sector-auto',
      'confirmed_sector_id': 'sector-chosen',
    });
    expect(form.files, isEmpty);
    expect(created.protocol, 'SIN-1044');
    expect(created.status, TicketStatus.forwarded);
  });

  test('cada foto repete o campo "photos" com contentType JPEG', () async {
    final photos = [
      await photo('1.jpg'),
      await photo('2.jpg'),
      await photo('3.jpg'),
    ];

    await repository.createTicket(request(photos: photos));

    final form = api.requests.single.data as FormData;
    expect(form.files.map((f) => f.key), ['photos', 'photos', 'photos']);
    expect(
      form.files.map((f) => f.value.contentType?.mimeType),
      everyElement('image/jpeg'),
    );
    expect(form.files.map((f) => f.value.length), everyElement(1024));
  });

  test(
    'não fixa Content-Type (o Dio gera o boundary) e usa timeout maior',
    () async {
      await repository.createTicket(request(photos: [await photo('1.jpg')]));

      final sent = api.requests.single;
      expect(sent.contentType, startsWith('multipart/form-data; boundary='));
      expect(sent.sendTimeout, TicketsRemoteDataSource.uploadTimeout);
    },
  );

  test('reporta o progresso entre 0 e 1', () async {
    final progress = <double>[];
    await repository.createTicket(
      request(photos: [await photo('1.jpg')]),
      onProgress: progress.add,
    );
    expect(progress, isNotEmpty);
    expect(progress.every((p) => p >= 0 && p <= 1), isTrue);
    expect(progress.last, 1);
  });

  test('foto temporária apagada antes do envio vira mensagem clara', () async {
    final missing = ReportPhoto(path: '${tmp.path}/sumiu.jpg', sizeInBytes: 1);
    expect(
      repository.createTicket(request(photos: [missing])),
      throwsA(
        isA<UnknownFailure>().having(
          (f) => f.message,
          'message',
          AppStrings.confirmPhotoMissing,
        ),
      ),
    );
  });

  test('validação da API vira ValidationFailure com as mensagens', () {
    api.routes['POST /tickets'] = (_) =>
        FakeReply.error(400, ['confirmed_sector_id deve ser um UUID']);
    expect(
      repository.createTicket(request()),
      throwsA(
        isA<ValidationFailure>().having((f) => f.messages, 'messages', [
          'confirmed_sector_id deve ser um UUID',
        ]),
      ),
    );
  });
}
