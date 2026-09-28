import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';

/// A.8 Perfil: dados da conta institucional (só leitura) e "Sair".
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _leaving = false;

  Future<void> _reload() async {
    final failure = await context.read<SessionCubit>().reloadUser();
    if (failure != null && mounted) AppSnackbar.failure(context, failure);
  }

  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(AppStrings.logoutConfirmTitle),
        content: const Text(AppStrings.logoutConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(AppStrings.cancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(AppStrings.logout),
          ),
        ],
      ),
    );
    if (!(confirmed ?? false) || !mounted) return;

    setState(() => _leaving = true);
    // Encerra no servidor quando possível, apaga cookies e caches e vai para
    // o login (mesmo sem rede). Ver `SessionCubit.logout`.
    await context.read<SessionCubit>().logout();
    if (mounted) setState(() => _leaving = false);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.select<SessionCubit, User?>(
      (cubit) => switch (cubit.state) {
        SessionAuthenticated(:final user) => user,
        _ => null,
      },
    );

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.profileTitle)),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            if (user != null) _ProfileHeader(user: user),
            const SizedBox(height: AppSpacing.xl),
            if (user != null) _ProfileDetails(user: user),
            const SizedBox(height: AppSpacing.sm),
            Text(
              AppStrings.profileReadOnlyHint,
              style: context.textStyles.bodySmall?.copyWith(
                color: context.colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            AppButton.secondary(
              label: AppStrings.logout,
              icon: Icons.logout,
              isLoading: _leaving,
              onPressed: _confirmLogout,
            ),
            const SizedBox(height: AppSpacing.xl),
            const _AppVersionFooter(),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});

  final User user;

  String get _initials {
    final parts = user.name.trim().split(RegExp(r'\s+'));
    final first = parts.first.isEmpty ? '' : parts.first[0];
    final last = parts.length > 1 ? parts.last[0] : '';
    return (first + last).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ExcludeSemantics(
          child: CircleAvatar(
            radius: 36,
            backgroundColor: context.colors.primaryContainer,
            child: Text(
              _initials,
              style: context.textStyles.headlineSmall?.copyWith(
                color: context.colors.onPrimaryContainer,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          user.name,
          textAlign: TextAlign.center,
          style: context.textStyles.titleLarge,
        ),
      ],
    );
  }
}

/// Nome, vínculo (oculto se `null`) e e-mail. Sem edição.
class _ProfileDetails extends StatelessWidget {
  const _ProfileDetails({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    final link = user.institutionalLink;
    return Card(
      child: Column(
        children: [
          _InfoTile(
            icon: Icons.person_outline,
            label: AppStrings.profileName,
            value: user.name,
          ),
          if (link != null) ...[
            const Divider(),
            _InfoTile(
              icon: Icons.badge_outlined,
              label: AppStrings.profileLink,
              value: link.label,
            ),
          ],
          const Divider(),
          _InfoTile(
            icon: Icons.mail_outline,
            label: AppStrings.profileEmail,
            value: user.email,
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: context.colors.onSurfaceVariant),
      title: Text(
        label,
        style: context.textStyles.labelMedium?.copyWith(
          color: context.colors.onSurfaceVariant,
        ),
      ),
      subtitle: Text(value, style: context.textStyles.bodyLarge),
    );
  }
}

class _AppVersionFooter extends StatefulWidget {
  const _AppVersionFooter();

  @override
  State<_AppVersionFooter> createState() => _AppVersionFooterState();
}

class _AppVersionFooterState extends State<_AppVersionFooter> {
  late final Future<String> _version = context
      .read<AppVersionProvider>()
      .label();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: _version,
      builder: (context, snapshot) {
        final version = snapshot.data;
        if (version == null) return const SizedBox.shrink();
        return Text(
          AppStrings.appVersion(version),
          textAlign: TextAlign.center,
          style: context.textStyles.bodySmall?.copyWith(
            color: context.colors.onSurfaceVariant,
          ),
        );
      },
    );
  }
}
