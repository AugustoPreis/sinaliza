import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Registra as licenças OFL das fontes empacotadas na tela de licenças.
void registerFontLicenses() {
  LicenseRegistry.addLicense(() async* {
    for (final (family, file) in const [
      ('Inter', 'assets/fonts/Inter-OFL.txt'),
      ('Manrope', 'assets/fonts/Manrope-OFL.txt'),
    ]) {
      final text = await rootBundle.loadString(file);
      yield LicenseEntryWithLineBreaks([family], text);
    }
  });
}
