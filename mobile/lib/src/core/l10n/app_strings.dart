/// Textos do app (somente pt-BR). Centralize aqui, sem literais nas telas.
abstract final class AppStrings {
  static const String appName = 'Sinaliza';

  // Login (A.1)
  static const String loginTitle = 'Entrar';
  static const String loginSubtitle =
      'Use sua conta institucional para abrir e acompanhar chamados.';
  static const String loginIdentifierLabel = 'Usuário institucional';
  static const String loginIdentifierHint = 'Matrícula ou e-mail';
  static const String loginPasswordLabel = 'Senha';
  static const String loginSubmit = 'Entrar';
  static const String loginIdentifierRequired =
      'Informe sua matrícula ou e-mail.';
  static const String loginPasswordRequired = 'Informe sua senha.';
  static const String loginInvalidCredentials =
      'Usuário ou senha inválidos. Verifique os dados e tente novamente.';
  static const String loginRateLimited =
      'Muitas tentativas. Tente novamente em alguns minutos.';
  static const String forgotPassword = 'Esqueci minha senha';

  // Esqueci minha senha
  static const String forgotPasswordTitle = 'Recuperar senha';
  static const String forgotPasswordDescription =
      'Informe seu e-mail institucional. Enviaremos um link para você criar '
      'uma nova senha no portal web do Sinaliza.';
  static const String forgotPasswordEmailLabel = 'E-mail institucional';
  static const String forgotPasswordEmailHint = 'nome@instituicao.edu.br';
  static const String forgotPasswordSubmit = 'Enviar link';
  static const String forgotPasswordEmailRequired =
      'Informe seu e-mail institucional.';
  static const String forgotPasswordEmailInvalid =
      'Informe um e-mail válido. A recuperação não aceita matrícula.';
  static const String forgotPasswordSent =
      'Se o e-mail estiver cadastrado, você receberá instruções para '
      'redefinir a senha. O link abre o portal web do Sinaliza.';
  static const String close = 'Fechar';

  // Sessão
  static const String sessionExpired = 'Sua sessão expirou. Entre novamente.';
  static const String sessionChecking = 'Verificando sua sessão...';
  static const String sessionCheckFailed =
      'Não foi possível verificar sua sessão.';
  static const String noAccessTitle = 'Acesso não disponível';
  static const String noAccessMessage =
      'Este aplicativo é para solicitantes. Use o portal web.';
  static const String logout = 'Sair';

  // Home e abas
  static const String tabTickets = 'Chamados';
  static const String tabNotifications = 'Notificações';

  /// Bolinha da aba: "9+" a partir de 10.
  static String unreadBadge(int count) => count > 9 ? '9+' : '$count';
  static String unreadSemantics(int count) =>
      count == 1 ? '1 não lida' : '$count não lidas';
  static const String tabProfile = 'Perfil';

  // Meus chamados (A.2)
  static const String ticketsTabAll = 'Todos';
  static const String ticketsTabOpen = 'Abertos';
  static const String ticketsTabResolved = 'Resolvidos';
  static const String ticketsEmptyAll = 'Você ainda não abriu chamados.';
  static const String ticketsEmptyOpen = 'Nenhum chamado em aberto.';
  static const String ticketsEmptyResolved = 'Nenhum chamado resolvido.';
  static const String ticketsLoadMoreFailed =
      'Não foi possível carregar mais chamados.';
  static String ticketOpenedAt(String when) => 'Aberto $when';
  static String ticketSemantics({
    required String protocol,
    required String status,
    required String sector,
    required String summary,
  }) => 'Chamado $protocol, $status, setor $sector. $summary';

  // Novo relato (A.3)
  static const String reportDescriptionLabel = 'Descreva o problema';
  static const String reportDescriptionHint =
      'Ex.: O projetor da sala 101 não liga';
  static const String reportDescriptionHelper =
      'Conte com suas palavras o que está acontecendo.';
  static const String reportDescriptionRequired = 'Descreva o problema.';
  static const String reportLocationTitle = 'Local';
  static const String reportBuildingLabel = 'Prédio';
  static const String reportEnvironmentLabel = 'Ambiente';
  static const String reportChooseBuildingFirst = 'Escolha o prédio primeiro.';
  static const String reportBuildingWithoutEnvironments =
      'Este prédio não tem ambientes cadastrados. Escolha outro ou contate a '
      'administração.';
  static const String reportLoadingLocations = 'Carregando locais...';
  static const String reportPhotosTitle = 'Fotos (opcional)';
  static const String reportPhotosHelper =
      'As fotos ajudam o setor a entender o problema.';
  static String reportPhotosCount(int count, int max) => '$count de $max';
  static const String reportAddFromCamera = 'Câmera';
  static const String reportAddFromGallery = 'Galeria';
  static const String reportPhotoLimitReached =
      'Você já anexou o máximo de fotos.';
  static String reportPhotoLimitPartial(int max) =>
      'Só é possível anexar até $max fotos. As demais foram ignoradas.';
  static const String reportPhotoFailed =
      'Não foi possível anexar a foto. Tente outra imagem.';
  static const String reportPhotoProcessing = 'Preparando fotos...';
  static const String reportRemovePhoto = 'Remover foto';
  static String reportPhotoSemantics(int index) => 'Foto $index';
  static const String reportPermissionTitle = 'Permissão necessária';
  static const String reportCameraPermissionDenied =
      'Para tirar fotos, permita o acesso à câmera nos ajustes do aparelho.';
  static const String reportGalleryPermissionDenied =
      'Para anexar fotos, permita o acesso às fotos nos ajustes do aparelho.';
  static const String openSettings = 'Abrir ajustes';
  static const String cancel = 'Cancelar';
  static const String reportContinue = 'Continuar';
  static const String reportClassifying =
      'Identificando o setor responsável...';
  static const String reportDiscardTitle = 'Descartar relato?';
  static const String reportDiscardMessage =
      'O que você preencheu será perdido.';
  static const String reportDiscard = 'Descartar';
  static const String reportKeepEditing = 'Continuar editando';

  // Confirmação do setor (A.4)
  static const String confirmSuggestionIntro =
      'Identificamos que este problema é do setor:';
  static const String confirmSendTo = 'Enviar para';
  static const String confirmSectorChanged = 'Você alterou o setor sugerido.';
  static const String confirmSummaryTitle = 'Seu relato';
  static const String confirmEdit = 'Editar';
  static String confirmPhotos(int count) => switch (count) {
    0 => 'Sem fotos',
    1 => '1 foto',
    _ => '$count fotos',
  };
  static const String confirmSubmit = 'Enviar chamado';
  static String confirmUploading(int percent) => 'Enviando... $percent%';
  static const String confirmSectorsUnavailable =
      'Não foi possível carregar a lista de setores. Você ainda pode enviar '
      'para o setor sugerido.';
  static const String confirmPhotosTooLarge =
      'As fotos são grandes demais para enviar. Remova algumas e tente de novo.';
  static const String confirmUploadFailed =
      'O envio falhou. Verifique sua conexão ou remova algumas fotos e tente '
      'de novo.';
  static const String confirmPhotoMissing =
      'Uma das fotos não está mais disponível. Volte e anexe novamente.';

  // Chamado enviado (A.5)
  static const String ticketSentHeadline = 'Chamado enviado';
  static const String ticketSentMessage =
      'Seu relato foi registrado e encaminhado ao setor responsável.';
  static const String ticketSentProtocolLabel = 'Nº de protocolo';
  static const String ticketSentProtocolHint =
      'Use este número para acompanhar ou falar sobre o chamado.';
  static const String ticketSentDestinationLabel = 'Encaminhado para';
  static const String ticketSentViewTicket = 'Ver chamado';
  static const String ticketSentBackToList = 'Voltar para meus chamados';

  // Detalhe do chamado (A.6)
  static const String detailCurrentSector = 'Setor responsável';
  static const String detailDescription = 'Descrição';
  static const String detailLocation = 'Local';
  static const String detailPhotos = 'Fotos';
  static const String detailTimeline = 'Linha do tempo';
  static String detailOpenedAt(String when) => 'Aberto em $when';
  static const String detailNotFound = 'Chamado não encontrado.';
  static const String detailNotFoundHint =
      'Ele pode ter sido removido ou não pertence à sua conta.';
  static const String back = 'Voltar';
  static String detailPhotoSemantics(int index, int total) =>
      'Foto $index de $total. Toque para ampliar.';
  static String detailPhotoViewerTitle(int index, int total) =>
      'Foto $index de $total';
  static const String detailPhotoUnavailable = 'Foto indisponível';

  // Notificações (A.7)
  static const String notificationsEmpty =
      'Você ainda não recebeu notificações.';
  static const String notificationsLoadMoreFailed =
      'Não foi possível carregar mais notificações.';
  static String notificationSemantics({
    required String message,
    required String protocol,
    required String when,
  }) => '$message Chamado $protocol, $when. Toque para abrir.';

  // Perfil (A.8)
  static const String profileName = 'Nome';
  static const String profileLink = 'Vínculo';
  static const String profileEmail = 'E-mail';
  static const String profileReadOnlyHint =
      'Estes dados vêm da sua conta institucional e não podem ser alterados '
      'pelo app.';
  static const String logoutConfirmTitle = 'Sair da conta?';
  static const String logoutConfirmMessage =
      'Você deixará de receber avisos dos seus chamados neste aparelho e '
      'precisará entrar de novo.';
  static String appVersion(String version) => 'Versão $version';

  // Push (task 15)
  static const String pushChannelName = 'Chamados';
  static const String pushChannelDescription =
      'Avisos de mudança de status dos seus chamados.';
  static String pushTitle(String protocol) => 'Chamado $protocol';
  static const String pushRationaleTitle = 'Receber avisos dos chamados?';
  static const String pushRationaleMessage =
      'Avisamos quando um chamado seu mudar de status, for encaminhado para '
      'outro setor ou for resolvido.';
  static const String pushRationaleAccept = 'Permitir avisos';
  static const String pushRationaleDecline = 'Agora não';

  // Títulos das telas
  static const String myTicketsTitle = 'Meus chamados';
  static const String newReportTitle = 'Novo relato';
  static const String confirmSectorTitle = 'Confirmar setor';
  static const String ticketSentTitle = 'Chamado enviado';
  static const String ticketDetailTitle = 'Detalhe do chamado';
  static const String notificationsTitle = 'Notificações';
  static const String profileTitle = 'Perfil';
  static const String comingSoon = 'Em construção.';

  // Ações comuns
  static const String retry = 'Tentar novamente';
  static const String copy = 'Copiar';
  static const String search = 'Buscar';
  static const String select = 'Selecionar';
  static const String showPassword = 'Mostrar senha';
  static const String hidePassword = 'Ocultar senha';

  // Estados de tela
  static const String loading = 'Carregando...';
  static const String genericError =
      'Não foi possível carregar as informações. Verifique sua conexão.';
  static const String emptyDefault = 'Nada por aqui ainda.';
  static const String noSearchResults = 'Nenhum resultado encontrado.';

  // Protocolo
  static const String protocolCopied = 'Protocolo copiado.';
  static String copyProtocol(String protocol) => 'Copiar protocolo $protocol';

  // Status do chamado
  static const String statusOpen = 'Aberto';
  static const String statusForwarded = 'Encaminhado';
  static const String statusInProgress = 'Em andamento';
  static const String statusResolved = 'Resolvido';
  static const String statusUnknown = 'Indefinido';

  // Vínculo institucional
  static const String linkStudent = 'Aluno';
  static const String linkProfessor = 'Professor';
  static const String linkStaff = 'Servidor';

  // Datas relativas
  static const String justNow = 'agora';
  static String minutesAgo(int minutes) => 'há $minutes min';
  static String hoursAgo(int hours) => 'há $hours h';
  static const String yesterday = 'ontem';
  static String daysAgo(int days) => 'há $days d';

  // Erros genéricos
  static String routeNotFound(String? route) => 'Rota não encontrada: $route';

  // Erros de rede/API (usados quando a API não envia `message`)
  static const String errorNetwork =
      'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  static const String errorUnauthorized =
      'Sua sessão expirou. Entre novamente.';
  static const String errorForbidden =
      'Você não tem permissão para realizar esta ação.';
  static const String errorNotFound = 'Não encontramos o que você procurou.';
  static const String errorValidation = 'Verifique os dados informados.';
  static const String errorRateLimit =
      'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  static const String errorServer =
      'O servidor está com problemas. Tente novamente em instantes.';
  static const String errorUnknown = 'Algo deu errado. Tente novamente.';

  // Dados de referência
  static const String noLocationsConfigured =
      'Nenhum local cadastrado. Contate a administração.';
  static const String noSectorsConfigured =
      'Nenhum setor cadastrado. Contate a administração.';

  // Catálogo de componentes (só debug)
  static const String catalogTitle = 'Catálogo de componentes';
}
