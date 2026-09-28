import 'package:device_preview/device_preview.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:mobile/src/app.dart';
import 'package:mobile/src/core/config/env.dart';
import 'package:mobile/src/core/config/font_licenses.dart';
import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/push/application/push_coordinator.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  Env.validate();
  registerFontLicenses();

  Intl.defaultLocale = 'pt_BR';
  await initializeDateFormatting('pt_BR');

  await initInjections();

  // Push (task 15): registra o token após o login, trata toques e pushes
  // com o app aberto. Sem Firebase configurado, fica inativo.
  final session = sl<SessionCubit>();
  await sl<PushCoordinator>().start(
    sessionChanges: session.stream,
    currentSession: session.state,
  );

  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.dark);

  // DevicePreview só em debug; nunca entra ativo num build release/profile.
  // `--dart-define=DEVICE_PREVIEW=false` desliga também no debug (teste em
  // emulador/aparelho com a tela inteira).
  runApp(
    DevicePreview(
      enabled: kDebugMode && _devicePreview,
      builder: (context) => MyApp(),
    ),
  );
}

const _devicePreview = bool.fromEnvironment(
  'DEVICE_PREVIEW',
  defaultValue: true,
);
