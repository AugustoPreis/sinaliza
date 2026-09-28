import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/home/presentation/widgets/home_tab_scope.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/notifications/presentation/cubit/unread_notifications_cubit.dart';
import 'package:mobile/src/features/notifications/presentation/pages/notifications_page.dart';
import 'package:mobile/src/features/profile/presentation/pages/profile_page.dart';
import 'package:mobile/src/features/tickets/presentation/pages/my_tickets_page.dart';

export 'package:mobile/src/features/home/presentation/widgets/home_tab_scope.dart'
    show HomeTab;

/// Shell com as abas Chamados (A.2), Notificações (A.7) e Perfil (A.8).
/// O `IndexedStack` preserva o estado (scroll, filtros) de cada aba; a aba
/// ativa é publicada por [HomeTabScope].
///
/// Também é dona da bolinha de não lidas: atualiza ao abrir a home, ao trocar
/// de aba, ao voltar ao app e quando chega aviso novo. Entrar ou sair da aba
/// Notificações marca tudo como lido (inclusive o que chegou enquanto a
/// pessoa estava nela).
class HomePage extends StatefulWidget {
  const HomePage({this.initialTab = HomeTab.tickets, super.key});

  final HomeTab initialTab;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late HomeTab _tab = widget.initialTab;

  static const _pages = [MyTicketsPage(), NotificationsPage(), ProfilePage()];

  late final UnreadNotificationsCubit _unread = UnreadNotificationsCubit(
    repository: context.read<NotificationsRepository>(),
  );
  StreamSubscription<void>? _signal;
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _syncUnread(leaving: null);
    _signal = context.read<NotificationsRefreshSignal>().stream.listen(
      (_) => _syncUnread(leaving: null),
    );
    _lifecycle = AppLifecycleListener(
      onResume: () => _syncUnread(leaving: null),
    );
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    _signal?.cancel();
    _unread.close();
    super.dispose();
  }

  void _syncUnread({required HomeTab? leaving}) {
    if (_tab == HomeTab.notifications || leaving == HomeTab.notifications) {
      _unread.markAllRead();
    } else {
      _unread.refresh();
    }
  }

  void _select(HomeTab tab) {
    if (tab == _tab) return;
    final leaving = _tab;
    setState(() => _tab = tab);
    _syncUnread(leaving: leaving);
  }

  @override
  Widget build(BuildContext context) {
    // Voltar numa aba secundária volta para "Chamados"; em "Chamados" o app
    // vai para segundo plano (a home é a raiz da pilha, não há login atrás).
    return PopScope(
      canPop: _tab == HomeTab.tickets,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _select(HomeTab.tickets);
      },
      child: HomeTabScope(
        current: _tab,
        // As abas usam o contador no "puxar para atualizar".
        child: BlocProvider.value(
          value: _unread,
          child: Scaffold(
            body: IndexedStack(
              index: _tab.index,
              children: [
                // Abas escondidas continuam montadas, mas sem animações.
                for (final (index, page) in _pages.indexed)
                  TickerMode(enabled: index == _tab.index, child: page),
              ],
            ),
            bottomNavigationBar: BlocBuilder<UnreadNotificationsCubit, int>(
              bloc: _unread,
              builder: (context, unread) => NavigationBar(
                selectedIndex: _tab.index,
                onDestinationSelected: (index) =>
                    _select(HomeTab.values[index]),
                destinations: [
                  const NavigationDestination(
                    icon: Icon(Icons.assignment_outlined),
                    selectedIcon: Icon(Icons.assignment),
                    label: AppStrings.tabTickets,
                  ),
                  NavigationDestination(
                    icon: _UnreadBadge(
                      count: unread,
                      child: const Icon(Icons.notifications_outlined),
                    ),
                    selectedIcon: _UnreadBadge(
                      count: unread,
                      child: const Icon(Icons.notifications),
                    ),
                    label: AppStrings.tabNotifications,
                  ),
                  const NavigationDestination(
                    icon: Icon(Icons.person_outline),
                    selectedIcon: Icon(Icons.person),
                    label: AppStrings.tabProfile,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count, required this.child});

  final int count;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Badge(
      isLabelVisible: count > 0,
      label: Text(
        AppStrings.unreadBadge(count),
        semanticsLabel: AppStrings.unreadSemantics(count),
      ),
      child: child,
    );
  }
}
