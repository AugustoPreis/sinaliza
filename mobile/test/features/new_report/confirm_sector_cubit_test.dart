import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/confirm_sector_cubit.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_state.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';

const ti = SectorRef(id: 'sector-ti', name: 'TI');
const manutencao = SectorRef(id: 'sector-man', name: 'Manutenção Predial');
const limpeza = SectorRef(id: 'sector-limp', name: 'Limpeza');

final report = NewReportState(
  description: '  O projetor não liga  ',
  buildings: const [bloco],
  building: bloco,
  environment: bloco.environments.first,
  photos: const [ReportPhoto(path: '/tmp/1.jpg', sizeInBytes: 10)],
  classification: const ClassificationResult(automaticSector: ti),
  classifiedDescription: 'O projetor não liga',
);

TicketCreated createdFor(NewTicketRequest request) => TicketCreated(
  id: 't-1',
  protocol: 'SIN-1050',
  status: TicketStatus.forwarded,
  automaticSector: ti,
  confirmedSector: request.confirmedSectorId == ti.id ? ti : manutencao,
  currentSector: request.confirmedSectorId == ti.id ? ti : manutencao,
  requesterCorrected: request.confirmedSectorId != request.automaticSectorId,
  createdAt: DateTime(2026, 9, 1),
);

void main() {
  late MockSectorsRepository sectors;
  late MockTicketsRepository tickets;
  late ConfirmSectorCubit cubit;
  final sent = <NewTicketRequest>[];

  setUpAll(() {
    registerMockFallbacks();
    registerFallbackValue(
      const NewTicketRequest(
        description: '',
        buildingId: '',
        environmentId: '',
        automaticSectorId: '',
        confirmedSectorId: '',
      ),
    );
  });

  setUp(() {
    sent.clear();
    sectors = MockSectorsRepository();
    tickets = MockTicketsRepository();
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [limpeza, manutencao, ti]);
    when(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).thenAnswer((invocation) async {
      final request = invocation.positionalArguments.first as NewTicketRequest;
      sent.add(request);
      final onProgress =
          invocation.namedArguments[#onProgress] as void Function(double)?;
      onProgress?.call(0.5);
      onProgress?.call(1);
      return createdFor(request);
    });
    cubit = ConfirmSectorCubit(
      report: () => report,
      sectors: sectors,
      tickets: tickets,
    );
  });

  tearDown(() => cubit.close());

  test('"Enviar para" começa com a sugestão', () async {
    await cubit.loadSectors();
    expect(cubit.state.suggestion, ti);
    expect(cubit.state.selected, ti);
    expect(cubit.state.changedSuggestion, isFalse);
    expect(cubit.state.sectors, [limpeza, manutencao, ti]);
  });

  test('sugestão fora da lista (cache velho) é incluída no topo', () async {
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [limpeza]);
    await cubit.loadSectors();
    expect(cubit.state.sectors, [ti, limpeza]);
  });

  test('confirmando: automático = confirmado = sugestão', () async {
    final created = await cubit.submit();

    final request = sent.single;
    expect(request.automaticSectorId, ti.id);
    expect(request.confirmedSectorId, ti.id);
    expect(request.description, 'O projetor não liga');
    expect(request.buildingId, bloco.id);
    expect(request.environmentId, bloco.environments.first.id);
    expect(request.photos, report.photos);
    expect(created?.requesterCorrected, isFalse);
  });

  test('RB-03: trocando o setor, automatic_sector_id continua o da '
      'classificação', () async {
    await cubit.loadSectors();
    cubit.select(manutencao);
    expect(cubit.state.changedSuggestion, isTrue);

    final created = await cubit.submit();

    final request = sent.single;
    expect(request.automaticSectorId, ti.id);
    expect(request.confirmedSectorId, manutencao.id);
    expect(created?.requesterCorrected, isTrue);
  });

  test('duplo toque cria um único chamado', () async {
    final gate = Completer<void>();
    when(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).thenAnswer((invocation) async {
      await gate.future;
      return createdFor(
        invocation.positionalArguments.first as NewTicketRequest,
      );
    });

    final first = cubit.submit();
    final second = cubit.submit();
    cubit.select(manutencao); // ignorado durante o envio
    gate.complete();

    expect(await first, isNotNull);
    expect(await second, isNull);
    expect(cubit.state.selected, ti);
    verify(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).called(1);
    // Depois de criado, novos toques devolvem o mesmo chamado sem reenviar.
    expect(await cubit.submit(), cubit.state.created);
  });

  test('progresso do envio de fotos', () async {
    final progress = <double?>[];
    final sub = cubit.stream.listen((s) => progress.add(s.progress));
    await cubit.submit();
    await Future<void>.delayed(Duration.zero); // entrega os eventos pendentes
    await sub.cancel();
    expect(progress, containsAllInOrder([0.0, 0.5, 1.0, null]));
  });

  group('erros mantêm tudo e permitem tentar de novo', () {
    Future<String?> failWith(AppFailure failure) async {
      when(
        () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
      ).thenThrow(failure);
      expect(await cubit.submit(), isNull);
      expect(cubit.state.isSubmitting, isFalse);
      expect(cubit.state.created, isNull);
      return cubit.state.submitError;
    }

    test('400 mostra as mensagens da API', () async {
      expect(
        await failWith(ValidationFailure(const ['Setor inválido.'])),
        'Setor inválido.',
      );
    });

    test('404 (setor/local removido) mostra a mensagem da API', () async {
      expect(
        await failWith(const NotFoundFailure('Setor não encontrado.')),
        'Setor não encontrado.',
      );
    });

    test('413 sugere remover fotos', () async {
      expect(
        await failWith(const UnknownFailure('Payload Too Large', 413)),
        AppStrings.confirmPhotosTooLarge,
      );
    });

    test('rede com fotos sugere conexão/remover fotos', () async {
      expect(
        await failWith(const NetworkFailure()),
        AppStrings.confirmUploadFailed,
      );
    });

    test('depois do erro, tentar de novo envia', () async {
      await failWith(const NetworkFailure());
      when(
        () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
      ).thenAnswer(
        (i) async =>
            createdFor(i.positionalArguments.first as NewTicketRequest),
      );
      expect(await cubit.submit(), isNotNull);
      expect(cubit.state.submitError, isNull);
    });
  });

  test('sem lista de setores ainda envia para a sugestão', () async {
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenThrow(const NetworkFailure());
    await cubit.loadSectors();
    expect(cubit.state.sectorsStatus, SectorsStatus.failure);

    await cubit.submit();
    expect(sent.single.confirmedSectorId, ti.id);
  });
}
