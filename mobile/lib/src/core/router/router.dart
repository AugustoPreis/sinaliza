import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/features/auth/presentation/pages/login_page.dart';
import 'package:mobile/src/features/auth/presentation/pages/no_access_page.dart';
import 'package:mobile/src/features/auth/presentation/pages/splash_page.dart';
import 'package:mobile/src/features/catalog/presentation/pages/component_catalog_page.dart';
import 'package:mobile/src/features/home/presentation/pages/home_page.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_cubit.dart';
import 'package:mobile/src/features/new_report/presentation/pages/confirm_sector_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/new_report_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/ticket_sent_page.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

class AppRouter {
  static String currentRoute = AppRouterEnum.splash.route;

  static Route<dynamic> generateRoute(RouteSettings settings) {
    currentRoute = settings.name ?? AppRouterEnum.splash.route;

    final Widget? page = switch (AppRouterEnum.fromRoute(settings.name)) {
      AppRouterEnum.splash => const SplashPage(),
      AppRouterEnum.login => const LoginPage(),
      AppRouterEnum.noAccess => const NoAccessPage(),
      AppRouterEnum.home => const HomePage(),
      AppRouterEnum.newReport => const NewReportPage(),
      // A.4 compartilha o cubit do fluxo criado pela A.3.
      AppRouterEnum.confirmSector => switch (settings.arguments) {
        final NewReportCubit flow => BlocProvider.value(
          value: flow,
          child: const ConfirmSectorPage(),
        ),
        _ => null,
      },
      AppRouterEnum.ticketSent => switch (settings.arguments) {
        final TicketCreated created => TicketSentPage(ticket: created),
        _ => null,
      },
      AppRouterEnum.ticketDetail => switch (settings.arguments) {
        final String ticketId => TicketDetailPage(ticketId: ticketId),
        _ => null,
      },
      AppRouterEnum.catalog when kDebugMode => const ComponentCatalogPage(),
      _ => null,
    };

    return MaterialPageRoute(
      settings: settings,
      builder: (_) =>
          page ??
          Scaffold(
            appBar: AppBar(),
            body: Center(child: Text(AppStrings.routeNotFound(settings.name))),
          ),
    );
  }
}
