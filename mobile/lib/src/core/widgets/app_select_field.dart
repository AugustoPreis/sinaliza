import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/utils/formatters/text_normalizer.dart';
import 'package:mobile/src/core/widgets/empty_view.dart';

/// Opção exibida no [AppSelectField] / [showAppSelectSheet].
class AppSelectOption<T> {
  const AppSelectOption({
    required this.value,
    required this.label,
    this.subtitle,
  });

  final T value;
  final String label;
  final String? subtitle;
}

/// Campo que abre um bottom sheet com busca (prédio, ambiente, setor).
/// Com `enabled: false` (ex.: ambiente antes de escolher o prédio) não abre.
class AppSelectField<T> extends StatelessWidget {
  const AppSelectField({
    required this.label,
    required this.options,
    required this.onChanged,
    this.value,
    this.hint,
    this.errorText,
    this.helperText,
    this.sheetTitle,
    this.enabled = true,
    this.prefixIcon,
    super.key,
  });

  final String label;
  final List<AppSelectOption<T>> options;
  final ValueChanged<T> onChanged;
  final T? value;
  final String? hint;
  final String? errorText;
  final String? helperText;
  final String? sheetTitle;
  final bool enabled;
  final IconData? prefixIcon;

  @override
  Widget build(BuildContext context) {
    final selected = options.where((option) => option.value == value);
    final selectedLabel = selected.isEmpty ? null : selected.first.label;

    return Semantics(
      button: true,
      enabled: enabled,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.control),
        onTap: enabled ? () => _open(context) : null,
        child: InputDecorator(
          isEmpty: selectedLabel == null,
          decoration: InputDecoration(
            labelText: label,
            hintText: hint ?? AppStrings.select,
            helperText: helperText,
            errorText: errorText,
            helperMaxLines: 8,
            errorMaxLines: 8,
            enabled: enabled,
            prefixIcon: prefixIcon == null ? null : Icon(prefixIcon),
            suffixIcon: const Icon(Icons.expand_more),
          ),
          child: selectedLabel == null
              ? null
              : Text(
                  selectedLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
        ),
      ),
    );
  }

  Future<void> _open(BuildContext context) async {
    final result = await showAppSelectSheet<T>(
      context: context,
      title: sheetTitle ?? label,
      options: options,
      selected: value,
    );
    if (result != null) onChanged(result);
  }
}

/// Abre o seletor em bottom sheet com campo de busca (ignora acentos e
/// maiúsculas). Retorna o valor escolhido ou `null` se fechado.
Future<T?> showAppSelectSheet<T>({
  required BuildContext context,
  required String title,
  required List<AppSelectOption<T>> options,
  T? selected,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) =>
        _AppSelectSheet<T>(title: title, options: options, selected: selected),
  );
}

class _AppSelectSheet<T> extends StatefulWidget {
  const _AppSelectSheet({
    required this.title,
    required this.options,
    this.selected,
  });

  final String title;
  final List<AppSelectOption<T>> options;
  final T? selected;

  @override
  State<_AppSelectSheet<T>> createState() => _AppSelectSheetState<T>();
}

class _AppSelectSheetState<T> extends State<_AppSelectSheet<T>> {
  String _query = '';

  List<AppSelectOption<T>> get _filtered {
    final query = normalizeForSearch(_query);
    if (query.isEmpty) return widget.options;
    return widget.options
        .where(
          (option) =>
              normalizeForSearch(option.label).contains(query) ||
              normalizeForSearch(option.subtitle ?? '').contains(query),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final filtered = _filtered;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.85,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: Text(widget.title, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: AppSpacing.md),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              child: TextField(
                autofocus: widget.options.length > 8,
                textInputAction: TextInputAction.search,
                onChanged: (value) => setState(() => _query = value),
                decoration: const InputDecoration(
                  hintText: AppStrings.search,
                  prefixIcon: Icon(Icons.search),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Flexible(
              child: filtered.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(AppSpacing.xl),
                      child: EmptyView(
                        icon: Icons.search_off,
                        message: AppStrings.noSearchResults,
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final option = filtered[index];
                        final isSelected = option.value == widget.selected;
                        return ListTile(
                          title: Text(option.label),
                          subtitle: option.subtitle == null
                              ? null
                              : Text(option.subtitle!),
                          selected: isSelected,
                          trailing: isSelected ? const Icon(Icons.check) : null,
                          onTap: () => Navigator.of(context).pop(option.value),
                        );
                      },
                    ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }
}
