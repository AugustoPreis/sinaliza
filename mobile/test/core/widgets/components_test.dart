import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_select_field.dart';
import 'package:mobile/src/core/widgets/app_text_field.dart';
import 'package:mobile/src/core/widgets/error_view.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/features/catalog/presentation/pages/component_catalog_page.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/presentation/widgets/ticket_status_chip.dart';

import '../../helpers/pump_app.dart';

void main() {
  group('AppButton', () {
    testWidgets('chama onPressed quando não está carregando', (tester) async {
      var taps = 0;
      await tester.pumpApp(AppButton(label: 'Enviar', onPressed: () => taps++));

      await tester.tap(find.text('Enviar'));
      expect(taps, 1);
    });

    testWidgets('loading mostra indicador e ignora toques', (tester) async {
      var taps = 0;
      await tester.pumpApp(
        AppButton(label: 'Enviar', isLoading: true, onPressed: () => taps++),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Enviar'), findsNothing);
      await tester.tap(find.byType(FilledButton));
      expect(taps, 0);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
    });
  });

  testWidgets('AppTextField de senha alterna mostrar/ocultar', (tester) async {
    await tester.pumpApp(const AppTextField(label: 'Senha', isPassword: true));

    EditableText editable() =>
        tester.widget<EditableText>(find.byType(EditableText));

    expect(editable().obscureText, isTrue);
    await tester.tap(find.byTooltip('Mostrar senha'));
    await tester.pump();
    expect(editable().obscureText, isFalse);
    expect(find.byTooltip('Ocultar senha'), findsOneWidget);
  });

  testWidgets('AppTextField mostra contador com maxLength', (tester) async {
    await tester.pumpApp(const AppTextField(label: 'Relato', maxLength: 500));
    await tester.enterText(find.byType(TextField), 'abc');
    await tester.pump();
    expect(find.text('3/500'), findsOneWidget);
  });

  testWidgets('AppSelectField busca sem acento e devolve o valor', (
    tester,
  ) async {
    int? chosen;
    await tester.pumpApp(
      AppSelectField<int>(
        label: 'Prédio',
        options: const [
          AppSelectOption(value: 1, label: 'Bloco A'),
          AppSelectOption(value: 2, label: 'Prédio da Reitoria'),
        ],
        onChanged: (value) => chosen = value,
      ),
    );

    await tester.tap(find.text('Prédio'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'predio');
    await tester.pump();

    expect(find.text('Bloco A'), findsNothing);
    await tester.tap(find.text('Prédio da Reitoria'));
    await tester.pumpAndSettle();
    expect(chosen, 2);
  });

  testWidgets('AppSelectField desabilitado não abre', (tester) async {
    await tester.pumpApp(
      AppSelectField<int>(
        label: 'Ambiente',
        enabled: false,
        options: const [AppSelectOption(value: 1, label: 'Sala 101')],
        onChanged: (_) {},
      ),
    );
    await tester.tap(find.text('Ambiente'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(find.text('Sala 101'), findsNothing);
  });

  group('ProtocolText', () {
    test('adiciona # sem duplicar', () {
      expect(ProtocolText.format('SIN-1042'), '#SIN-1042');
      expect(ProtocolText.format('#SIN-1042'), '#SIN-1042');
    });

    testWidgets('copia o protocolo e avisa', (tester) async {
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied =
                (call.arguments as Map<Object?, Object?>)['text'] as String?;
          }
          return null;
        },
      );

      await tester.pumpApp(const ProtocolText('SIN-1042'));
      await tester.tap(find.text('#SIN-1042'));
      await tester.pump();

      expect(copied, '#SIN-1042');
      expect(find.text('Protocolo copiado.'), findsOneWidget);
    });
  });

  testWidgets('TicketStatusChip mostra o rótulo do status', (tester) async {
    await tester.pumpApp(const TicketStatusChip(TicketStatus.inProgress));
    expect(find.text('Em andamento'), findsOneWidget);
  });

  testWidgets('ErrorView chama onRetry', (tester) async {
    var retried = false;
    await tester.pumpApp(ErrorView(onRetry: () => retried = true));
    await tester.tap(find.text('Tentar novamente'));
    expect(retried, isTrue);
  });

  testWidgets('catálogo renderiza sem erros', (tester) async {
    await tester.runAsync(() => initializeDateFormatting('pt_BR'));
    await tester.pumpWidget(
      MaterialApp(theme: appTheme, home: const ComponentCatalogPage()),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.byType(ComponentCatalogPage), findsOneWidget);
  });
}
