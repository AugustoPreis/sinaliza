import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/router/app_navigator.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';

/// Traduz mudanças do [SessionCubit] em navegação, trocando a pilha inteira
/// (o voltar do Android nunca retorna ao login a partir da home).
///
/// Só navega quando o *tipo* de estado muda: atualizar o usuário dentro de
/// `SessionAuthenticated` não mexe na pilha.
class SessionNavigationListener extends StatelessWidget {
  const SessionNavigationListener({
    required this.navigator,
    required this.child,
    super.key,
  });

  final AppNavigator navigator;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return BlocListener<SessionCubit, SessionState>(
      listenWhen: (previous, current) =>
          previous.runtimeType != current.runtimeType,
      listener: (context, state) {
        final route = switch (state) {
          SessionAuthenticated() => AppRouterEnum.home,
          SessionNoAccess() => AppRouterEnum.noAccess,
          SessionUnauthenticated() => AppRouterEnum.login,
          // Verificando ou falhou: o splash mostra loading/erro.
          SessionUnknown() || SessionCheckFailed() => null,
        };
        if (route == null) return;

        navigator.resetTo(route.route);

        if (state case SessionUnauthenticated(:final message?)) {
          final messenger = navigator.messengerKey.currentState;
          if (messenger != null) AppSnackbar.showOn(messenger, message);
        }
      },
      child: child,
    );
  }
}
