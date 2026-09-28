import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';

void main() {
  Future<void> showFailure(WidgetTester tester, AppFailure failure) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => AppSnackbar.failure(context, failure),
              child: const Text('falhar'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('falhar'));
    await tester.pump();
  }

  testWidgets('failure mostra a mensagem do erro', (tester) async {
    await showFailure(tester, const ServerFailure());

    expect(find.text(AppStrings.errorServer), findsOneWidget);
  });

  testWidgets(
    'failure ignora 401: o aviso de sessão expirada vem do SessionCubit',
    (tester) async {
      await showFailure(tester, const UnauthorizedFailure());

      expect(find.byType(SnackBar), findsNothing);
      expect(find.text(AppStrings.errorUnauthorized), findsNothing);
    },
  );
}
