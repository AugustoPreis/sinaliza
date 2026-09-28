import 'package:cookie_jar/cookie_jar.dart';
import 'package:get_it/get_it.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/cookie_jar_factory.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/router/app_navigator.dart';
import 'package:mobile/src/core/utils/constants/network_constant.dart';
import 'package:mobile/src/features/auth/auth_injections.dart';
import 'package:mobile/src/features/new_report/new_report_injections.dart';
import 'package:mobile/src/features/notifications/notifications_injections.dart';
import 'package:mobile/src/features/push/data/firebase_push_messaging.dart';
import 'package:mobile/src/features/push/push_injections.dart';
import 'package:mobile/src/features/reference_data/reference_data_injections.dart';
import 'package:mobile/src/features/tickets/tickets_injections.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sl = GetIt.instance;

Future<void> initInjections() async {
  sl
    ..registerSingleton<AppNavigator>(AppNavigator())
    ..registerLazySingleton<AppVersionProvider>(PackageInfoVersionProvider.new);
  await initNetworkInjections();
  await initSharedPrefsInjections();
  initAuthInjections();
  initReferenceDataInjections();
  initTicketsInjections();
  initNewReportInjections();
  initNotificationsInjections();
  initPushInjections(await createPushMessaging());
}

Future<void> initSharedPrefsInjections() async {
  sl.registerSingletonAsync<SharedPreferences>(() async {
    return await SharedPreferences.getInstance();
  });

  await sl.isReady<SharedPreferences>();
}

Future<void> initNetworkInjections() async {
  sl.registerSingleton<CookieJar>(await createPersistentCookieJar());
  sl.registerSingleton<SessionEventBus>(SessionEventBus());
  sl.registerSingleton<ApiClient>(
    ApiClient(baseUrl: apiBaseUrl, cookieJar: sl(), sessionEvents: sl()),
  );
}
