import 'package:equatable/equatable.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';

/// Item de `GET /notifications` (tela A.7).
class AppNotification extends Equatable {
  const AppNotification({
    required this.id,
    required this.ticketId,
    required this.protocol,
    required this.type,
    required this.message,
    required this.createdAt,
  });

  final String id;

  /// UUID do chamado, para abrir o detalhe ao tocar.
  final String ticketId;
  final String protocol;
  final NotificationType type;

  /// Texto pronto da API, ex.: "Seu chamado SIN-1042 foi resolvido."
  final String message;
  final DateTime createdAt;

  @override
  List<Object?> get props => [id, ticketId, protocol, type, message, createdAt];
}
