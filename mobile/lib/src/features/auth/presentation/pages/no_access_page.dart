import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';

/// Conta autenticada sem `tickets:create` (equipe de setor/admin): o app é só
/// do solicitante, então só resta sair.
class NoAccessPage extends StatefulWidget {
  const NoAccessPage({super.key});

  @override
  State<NoAccessPage> createState() => _NoAccessPageState();
}

class _NoAccessPageState extends State<NoAccessPage> {
  bool _leaving = false;

  Future<void> _logout() async {
    setState(() => _leaving = true);
    await context.read<SessionCubit>().logout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock_outline, size: 56, color: context.colors.primary),
              const SizedBox(height: AppSpacing.lg),
              Text(
                AppStrings.noAccessTitle,
                textAlign: TextAlign.center,
                style: context.textStyles.headlineSmall,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                AppStrings.noAccessMessage,
                textAlign: TextAlign.center,
                style: context.textStyles.bodyLarge?.copyWith(
                  color: context.colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: AppStrings.logout,
                icon: Icons.logout,
                isLoading: _leaving,
                onPressed: _logout,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
