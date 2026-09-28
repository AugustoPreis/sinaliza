import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/error_view.dart';
import 'package:mobile/src/core/widgets/loading_view.dart';
import 'package:mobile/src/core/widgets/sinaliza_logo.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';

/// Rota inicial. Dispara a verificação da sessão e mostra o carregamento; a
/// navegação para login/home é feita pelo `SessionNavigationListener`, que já
/// está montado quando o resultado chega. Sem rede, oferece "Tentar novamente".
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    context.read<SessionCubit>().checkSession();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocBuilder<SessionCubit, SessionState>(
          builder: (context, state) {
            return Column(
              children: [
                const SizedBox(height: AppSpacing.xxl * 2),
                // Mesmo símbolo da splash nativa, para a transição ser suave.
                const SinalizaLogo(size: 96),
                const SizedBox(height: AppSpacing.md),
                Text(
                  AppStrings.appName,
                  style: context.textStyles.headlineLarge?.copyWith(
                    color: context.colors.primary,
                  ),
                ),
                Expanded(
                  child: switch (state) {
                    SessionCheckFailed(:final failure) => ErrorView(
                      message:
                          '${AppStrings.sessionCheckFailed}\n${failure.message}',
                      onRetry: context.read<SessionCubit>().checkSession,
                    ),
                    _ => const LoadingView(message: AppStrings.sessionChecking),
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
