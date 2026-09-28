import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_inline_alert.dart';
import 'package:mobile/src/core/widgets/app_text_field.dart';
import 'package:mobile/src/core/widgets/sinaliza_logo.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/auth/presentation/widgets/forgot_password_sheet.dart';

/// A.1 Login institucional. Sem autocadastro (RB-01): não há "Criar conta".
class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => LoginCubit(
        repository: context.read<AuthRepository>(),
        session: context.read<SessionCubit>(),
      ),
      child: const _LoginView(),
    );
  }
}

class _LoginView extends StatefulWidget {
  const _LoginView();

  @override
  State<_LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<_LoginView> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _passwordFocus = FocusNode();

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    final ok = await context.read<LoginCubit>().submit(
      identifier: _identifier.text,
      password: _password.text,
    );
    // Oferece salvar a senha no gerenciador do sistema.
    if (ok) TextInput.finishAutofillContext();
  }

  void _openForgotPassword() {
    final typed = _identifier.text.trim();
    showForgotPasswordSheet(
      context,
      // Só reaproveita o que foi digitado se for e-mail (a API não aceita
      // matrícula na recuperação).
      initialEmail: typed.contains('@') ? typed : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: BlocBuilder<LoginCubit, LoginState>(
              builder: (context, state) {
                final cubit = context.read<LoginCubit>();
                return AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Center(child: SinalizaLogo(size: 64)),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        AppStrings.appName,
                        textAlign: TextAlign.center,
                        style: context.textStyles.headlineLarge?.copyWith(
                          color: context.colors.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        AppStrings.loginSubtitle,
                        textAlign: TextAlign.center,
                        style: context.textStyles.bodyMedium?.copyWith(
                          color: context.colors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      AppTextField(
                        controller: _identifier,
                        label: AppStrings.loginIdentifierLabel,
                        hint: AppStrings.loginIdentifierHint,
                        prefixIcon: Icons.person_outline,
                        errorText: state.identifierError,
                        enabled: !state.isSubmitting,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.username],
                        onChanged: (_) => cubit.fieldChanged(),
                        onSubmitted: (_) => _passwordFocus.requestFocus(),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      AppTextField(
                        controller: _password,
                        focusNode: _passwordFocus,
                        label: AppStrings.loginPasswordLabel,
                        prefixIcon: Icons.lock_outline,
                        isPassword: true,
                        errorText: state.passwordError,
                        enabled: !state.isSubmitting,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.password],
                        onChanged: (_) => cubit.fieldChanged(),
                        onSubmitted: (_) => _submit(),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: AppButton.text(
                          label: AppStrings.forgotPassword,
                          onPressed: state.isSubmitting
                              ? null
                              : _openForgotPassword,
                        ),
                      ),
                      if (state.errorMessage != null) ...[
                        AppInlineAlert(message: state.errorMessage!),
                        const SizedBox(height: AppSpacing.lg),
                      ] else
                        const SizedBox(height: AppSpacing.sm),
                      AppButton(
                        label: AppStrings.loginSubmit,
                        isLoading: state.isSubmitting,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
      // Atalho de desenvolvimento para o catálogo de componentes.
      floatingActionButton: kDebugMode
          ? FloatingActionButton.small(
              tooltip: AppStrings.catalogTitle,
              onPressed: () =>
                  Navigator.of(context).pushNamed(AppRouterEnum.catalog.route),
              child: const Icon(Icons.widgets_outlined),
            )
          : null,
    );
  }
}
