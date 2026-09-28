import 'package:equatable/equatable.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';

/// Conteúdo de um push do Sinaliza.
///
/// Contrato (task 15): `notification` (título/corpo) + `data`
/// `{ ticket_id, protocol, type }`, com `type` de `ENotificationType`.
class PushPayload extends Equatable {
  const PushPayload({
    required this.ticketId,
    this.protocol,
    this.type = NotificationType.unknown,
    this.title,
    this.body,
  });

  final String ticketId;
  final String? protocol;
  final NotificationType type;
  final String? title;
  final String? body;

  /// `null` se o push não tiver `ticket_id` (não há o que abrir).
  static PushPayload? fromData(
    Map<String, dynamic> data, {
    String? title,
    String? body,
  }) {
    final ticketId = data['ticket_id'];
    if (ticketId is! String || ticketId.isEmpty) return null;
    final protocol = data['protocol'];
    final type = data['type'];
    return PushPayload(
      ticketId: ticketId,
      protocol: protocol is String ? protocol : null,
      type: NotificationType.fromApi(type is String ? type : null),
      title: title,
      body: body,
    );
  }

  @override
  List<Object?> get props => [ticketId, protocol, type, title, body];
}
