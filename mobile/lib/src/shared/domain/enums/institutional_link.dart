import 'package:mobile/src/core/l10n/app_strings.dart';

/// Vínculo institucional do usuário (`institutionalLink` na API).
enum InstitutionalLink {
  student('ALUNO', AppStrings.linkStudent),
  professor('PROFESSOR', AppStrings.linkProfessor),
  staff('SERVIDOR', AppStrings.linkStaff);

  const InstitutionalLink(this.apiValue, this.label);

  final String apiValue;
  final String label;

  /// A API pode mandar `null` (ex.: contas administrativas). Valores
  /// desconhecidos também viram `null`, sem quebrar o parse.
  static InstitutionalLink? fromApi(String? value) {
    for (final link in values) {
      if (link.apiValue == value) return link;
    }
    return null;
  }
}
