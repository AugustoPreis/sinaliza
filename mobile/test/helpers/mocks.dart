import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/shared/data/models/ticket_models.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mocktail/mocktail.dart';

import '../fixtures/fixture_reader.dart';

class MockTicketsRepository extends Mock implements TicketsRepository {}

/// Registra os `any()` de tipos do app no mocktail.
void registerMockFallbacks() {
  registerFallbackValue(TicketFilter.all);
}

TicketListItem buildTicket(
  int n, {
  TicketStatus status = TicketStatus.open,
  String sector = 'TI',
}) {
  return TicketListItem(
    id: 'ticket-$n',
    protocol: 'SIN-${1000 + n}',
    descriptionSummary: 'Problema número $n',
    currentSector: SectorRef(id: 'sector-$sector', name: sector),
    status: status,
    createdAt: DateTime(2026, 9, 1, 10).subtract(Duration(hours: n)),
  );
}

PagedResult<TicketListItem> buildPage(
  List<TicketListItem> items, {
  int page = 1,
  int pageSize = 20,
  int? total,
}) {
  return PagedResult(
    items: items,
    page: page,
    pageSize: pageSize,
    total: total ?? items.length,
  );
}

/// Qualquer aba devolve lista vazia (para testes que só passam pela home).
void stubEmptyTickets(MockTicketsRepository repository) {
  when(
    () => repository.getMyTickets(
      filter: any(named: 'filter'),
      page: any(named: 'page'),
    ),
  ).thenAnswer((_) async => buildPage(const []));
}

class MockLocationsRepository extends Mock implements LocationsRepository {}

class MockSectorsRepository extends Mock implements SectorsRepository {}

class MockClassificationRepository extends Mock
    implements ClassificationRepository {}

/// Picker controlado pelo teste.
class FakePhotoPicker implements PhotoPicker {
  List<String> galleryResult = const [];
  String? cameraResult;
  Object? error;
  int? lastLimit;

  @override
  Future<String?> takePhoto() async {
    if (error != null) throw error!;
    return cameraResult;
  }

  @override
  Future<List<String>> pickFromGallery({required int limit}) async {
    lastLimit = limit;
    if (error != null) throw error!;
    return galleryResult;
  }
}

/// "Comprime" trocando o caminho e registrando o que foi processado.
class FakePhotoProcessor implements PhotoProcessor {
  final processed = <String>[];
  final discarded = <ReportPhoto>[];
  final failing = <String>{};

  @override
  Future<ReportPhoto> process(String sourcePath) async {
    if (failing.contains(sourcePath)) throw const PhotoProcessingException();
    processed.add(sourcePath);
    return ReportPhoto(path: '$sourcePath.compressed.jpg', sizeInBytes: 300000);
  }

  @override
  Future<void> discard(ReportPhoto photo) async => discarded.add(photo);
}

const bloco = Building(
  id: 'b1',
  name: 'Bloco A',
  environments: [
    Environment(id: 'e1', name: 'Sala 101'),
    Environment(id: 'e2', name: 'Corredor'),
  ],
);
const biblioteca = Building(
  id: 'b2',
  name: 'Biblioteca',
  environments: [Environment(id: 'e3', name: 'Salão')],
);
const semAmbientes = Building(id: 'b3', name: 'Anexo', environments: []);

/// Detalhe do fixture `api/ticket_detail` (com [id] trocado se informado).
TicketDetail fixtureTicketDetail({String? id}) {
  final json = fixture('api/ticket_detail');
  if (id != null) json['id'] = id;
  return TicketDetailModel.fromJson(json);
}

/// Qualquer detalhe pedido devolve o fixture com o id pedido.
void stubTicketDetail(MockTicketsRepository repository) {
  when(() => repository.getTicket(any())).thenAnswer(
    (invocation) async =>
        fixtureTicketDetail(id: invocation.positionalArguments.first as String),
  );
}

class MockNotificationsRepository extends Mock
    implements NotificationsRepository {}

AppNotification buildNotification(
  int n, {
  NotificationType type = NotificationType.ticketStatusChanged,
}) {
  return AppNotification(
    id: 'ntf-$n',
    ticketId: 'ticket-$n',
    protocol: 'SIN-${2000 + n}',
    type: type,
    message: 'Mensagem $n',
    createdAt: DateTime(2026, 9, 1, 10).subtract(Duration(hours: n)),
  );
}

/// Histórico vazio (para testes que só passam pela home).
MockNotificationsRepository emptyNotificationsRepository({int unread = 0}) {
  final repository = MockNotificationsRepository();
  when(() => repository.getNotifications(page: any(named: 'page'))).thenAnswer(
    (_) async => const PagedResult(items: [], page: 1, pageSize: 30, total: 0),
  );
  stubUnread(repository, unread);
  return repository;
}

/// Contador de não lidas (bolinha da aba) e o "marcar como lidas".
void stubUnread(MockNotificationsRepository repository, int unread) {
  when(repository.getUnreadCount).thenAnswer((_) async => unread);
  when(repository.markAllRead).thenAnswer((_) async {});
}

class FakeAppVersion implements AppVersionProvider {
  @override
  Future<String> label() async => '1.0.0 (7)';
}

PagedResult<T> buildPageOf<T>(List<T> items, {int page = 1, int? total}) =>
    PagedResult(
      items: items,
      page: page,
      pageSize: 30,
      total: total ?? items.length,
    );
