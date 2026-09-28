import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/widgets/empty_view.dart';

/// Conteúdo provisório das telas ainda não implementadas (tasks 06 a 14).
class ComingSoonView extends StatelessWidget {
  const ComingSoonView({this.action, super.key});

  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return EmptyView(
      icon: Icons.construction_outlined,
      message: AppStrings.comingSoon,
      action: action,
    );
  }
}
