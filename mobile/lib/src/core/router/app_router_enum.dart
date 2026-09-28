enum AppRouterEnum {
  splash('/'),
  login('/login'),

  /// Conta sem `tickets:create` (setor/admin).
  noAccess('/no-access'),

  /// Shell com as abas Chamados (A.2), Notificações (A.7) e Perfil (A.8).
  home('/home'),

  /// A.3 Novo relato.
  newReport('/new-report'),

  /// A.4 Confirmação do setor. Argumento: o `NewReportCubit` do fluxo.
  confirmSector('/new-report/confirm-sector'),

  /// A.5 Chamado enviado. Argumento: `TicketCreated`.
  ticketSent('/new-report/sent'),

  /// A.6 Detalhe do chamado. Argumento: `ticketId` (String, UUID).
  ticketDetail('/tickets/detail'),

  /// Catálogo de componentes. Só é registrada em debug.
  catalog('/catalog');

  const AppRouterEnum(this.route);
  final String route;

  static AppRouterEnum? fromRoute(String? route) {
    for (final value in values) {
      if (value.route == route) return value;
    }
    return null;
  }
}
