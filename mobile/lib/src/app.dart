import 'package:device_preview/device_preview.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_navigator.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/auth/presentation/widgets/session_navigation_listener.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_changed_signal.dart';

/// Repositórios e serviços que as telas leem via `context.read`, vindos do
/// `get_it`. Nos testes, [MyApp.repositories] substitui esta lista.
List<RepositoryProvider<Object>> defaultRepositoryProviders() => [
  RepositoryProvider<AuthRepository>.value(value: sl()),
  RepositoryProvider<TicketsRepository>.value(value: sl()),
  RepositoryProvider<LocationsRepository>.value(value: sl()),
  RepositoryProvider<SectorsRepository>.value(value: sl()),
  RepositoryProvider<ClassificationRepository>.value(value: sl()),
  RepositoryProvider<PhotoPicker>.value(value: sl()),
  RepositoryProvider<PhotoProcessor>.value(value: sl()),
  RepositoryProvider<NotificationsRepository>.value(value: sl()),
  RepositoryProvider<NotificationsRefreshSignal>.value(value: sl()),
  RepositoryProvider<AppVersionProvider>.value(value: sl()),
  RepositoryProvider<TicketChangedSignal>.value(value: sl()),
];

class MyApp extends StatelessWidget {
  MyApp({
    SessionCubit? sessionCubit,
    AppNavigator? navigator,
    List<RepositoryProvider<Object>>? repositories,
    super.key,
  }) : sessionCubit = sessionCubit ?? sl<SessionCubit>(),
       navigator = navigator ?? sl<AppNavigator>(),
       repositories = repositories ?? defaultRepositoryProviders();

  final SessionCubit sessionCubit;
  final AppNavigator navigator;
  final List<RepositoryProvider<Object>> repositories;

  static const Locale locale = Locale('pt', 'BR');

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: repositories,
      child: BlocProvider<SessionCubit>.value(
        value: sessionCubit,
        child: ScreenUtilInit(
          designSize: const Size(360, 690),
          minTextAdapt: true,
          splitScreenMode: true,
          builder: (context, child) {
            return MaterialApp(
              title: AppStrings.appName,
              debugShowCheckedModeBanner: false,
              theme: appTheme,
              navigatorKey: navigator.navigatorKey,
              scaffoldMessengerKey: navigator.messengerKey,
              locale: kDebugMode
                  ? DevicePreview.locale(context) ?? locale
                  : locale,
              supportedLocales: const [locale],
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              builder: (context, child) {
                final app = SessionNavigationListener(
                  navigator: navigator,
                  child: child ?? const SizedBox.shrink(),
                );
                return kDebugMode
                    ? DevicePreview.appBuilder(context, app)
                    : app;
              },
              onGenerateRoute: AppRouter.generateRoute,
              initialRoute: AppRouterEnum.splash.route,
            );
          },
        ),
      ),
    );
  }
}
