import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_inline_alert.dart';
import 'package:mobile/src/core/widgets/app_text_field.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/forgot_password_cubit.dart';

/// Abre o "Esqueci minha senha" em bottom sheet.
Future<void> showForgotPasswordSheet(
  BuildContext context, {
  String? initialEmail,
}) {
  final repository = context.read<AuthRepository>();
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => BlocProvider(
      create: (_) => ForgotPasswordCubit(repository: repository),
      child: ForgotPasswordSheet(initialEmail: initialEmail),
    ),
  );
}

class ForgotPasswordSheet extends StatefulWidget {
  const ForgotPasswordSheet({this.initialEmail, super.key});

  final String? initialEmail;

  @override
  State<ForgotPasswordSheet> createState() => _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends State<ForgotPasswordSheet> {
  late final _email = TextEditingController(text: widget.initialEmail);

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  void _submit() => context.read<ForgotPasswordCubit>().submit(_email.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.xl,
        right: AppSpacing.xl,
        bottom: MediaQuery.viewInsetsOf(context).bottom + AppSpacing.xl,
      ),
      child: BlocBuilder<ForgotPasswordCubit, ForgotPasswordState>(
        builder: (context, state) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                AppStrings.forgotPasswordTitle,
                style: context.textStyles.titleLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              if (state.sent) ...[
                const AppInlineAlert(
                  message: AppStrings.forgotPasswordSent,
                  type: AppAlertType.success,
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: AppStrings.close,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ] else ...[
                Text(
                  AppStrings.forgotPasswordDescription,
                  style: context.textStyles.bodyMedium?.copyWith(
                    color: context.colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppTextField(
                  controller: _email,
                  label: AppStrings.forgotPasswordEmailLabel,
                  hint: AppStrings.forgotPasswordEmailHint,
                  prefixIcon: Icons.mail_outline,
                  errorText: state.emailError,
                  enabled: !state.isSubmitting,
                  autofocus: widget.initialEmail == null,
                  autocorrect: false,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.send,
                  autofillHints: const [AutofillHints.email],
                  onChanged: (_) =>
                      context.read<ForgotPasswordCubit>().fieldChanged(),
                  onSubmitted: (_) => _submit(),
                ),
                if (state.errorMessage != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  AppInlineAlert(message: state.errorMessage!),
                ],
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: AppStrings.forgotPasswordSubmit,
                  isLoading: state.isSubmitting,
                  onPressed: _submit,
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
