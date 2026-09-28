import 'package:equatable/equatable.dart';

/// Foto já comprimida (JPEG, lado maior ≤ 1920 px) pronta para o envio.
class ReportPhoto extends Equatable {
  const ReportPhoto({
    required this.path,
    required this.sizeInBytes,
    this.mimeType = 'image/jpeg',
  });

  /// Arquivo temporário gerado pela compressão.
  final String path;
  final int sizeInBytes;

  /// Aceitos pela API: `image/jpeg`, `image/png`, `image/webp`. O app sempre
  /// converte para JPEG (inclusive HEIC do iPhone).
  final String mimeType;

  @override
  List<Object?> get props => [path, sizeInBytes, mimeType];
}
