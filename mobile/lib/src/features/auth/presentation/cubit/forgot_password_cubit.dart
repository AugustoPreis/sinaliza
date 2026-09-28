import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';

class ForgotPasswordState extends Equatable {
  const ForgotPasswordState({
    this.isSubmitting = false,
    this.sent = false,
    this.emailError,
    this.errorMessage,
  });

  final bool isSubmitting;

  /// Pedido aceito: mostrar a confirmação neutra.
  final bool sent;
  final String? emailError;
  final String? errorMessage;

  @override
  List<Object?> get props => [isSubmitting, sent, emailError, errorMessage];
}

/// "Esqueci minha senha". A API aceita só e-mail e responde sempre `204`;
/// o link enviado abre a redefinição no portal web (o app não redefine).
class ForgotPasswordCubit extends Cubit<ForgotPasswordState> {
  ForgotPasswordCubit({required AuthRepository repository})
    : _repository = repository,
      super(const ForgotPasswordState());

  final AuthRepository _repository;

  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static bool isEmail(String value) => _email.hasMatch(value.trim());

  Future<void> submit(String email) async {
    if (state.isSubmitting || state.sent) return;

    final value = email.trim();
    if (value.isEmpty || !isEmail(value)) {
      emit(
        ForgotPasswordState(
          emailError: value.isEmpty
              ? AppStrings.forgotPasswordEmailRequired
              : AppStrings.forgotPasswordEmailInvalid,
        ),
      );
      return;
    }

    emit(const ForgotPasswordState(isSubmitting: true));
    try {
      await _repository.forgotPassword(value);
      emit(const ForgotPasswordState(sent: true));
    } on NotFoundFailure {
      // Nunca revelar se a conta existe: mesma confirmação.
      emit(const ForgotPasswordState(sent: true));
    } on ValidationFailure {
      emit(
        const ForgotPasswordState(
          emailError: AppStrings.forgotPasswordEmailInvalid,
        ),
      );
    } on RateLimitFailure {
      emit(
        const ForgotPasswordState(errorMessage: AppStrings.loginRateLimited),
      );
    } on AppFailure catch (failure) {
      emit(ForgotPasswordState(errorMessage: failure.message));
    }
  }

  void fieldChanged() {
    if (state.emailError != null || state.errorMessage != null) {
      emit(const ForgotPasswordState());
    }
  }
}
