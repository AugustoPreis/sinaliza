import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';

/// Comprime a foto escolhida antes de guardá-la no relato.
abstract interface class PhotoProcessor {
  /// Lado maior ≤ [maxSide] px, JPEG qualidade [quality]. Lança
  /// [PhotoProcessingException] se não conseguir ler/comprimir.
  Future<ReportPhoto> process(String sourcePath);

  /// Apaga o arquivo temporário gerado por [process].
  Future<void> discard(ReportPhoto photo);
}

class PhotoProcessingException implements Exception {
  const PhotoProcessingException([this.cause]);

  final Object? cause;
}

/// Valor para `minWidth`/`minHeight` do `flutter_image_compress` que deixa o
/// lado maior da imagem com no máximo [maxSide].
///
/// O plugin escala por `max(1, min(w / minWidth, h / minHeight))`: com
/// `minWidth = minHeight = maxSide`, uma foto 4000x3000 viraria 2560x1920
/// (o lado *menor* é que fica em 1920). Passando o mesmo valor `m` nos dois,
/// a escala é `lado menor / m`; com `m = maxSide * menor / maior` ela vira
/// `maior / maxSide`, e o lado maior termina em [maxSide]. Como os dois
/// valores são iguais, a rotação EXIF não altera o resultado.
int compressionMinSide({
  required int width,
  required int height,
  int maxSide = ImageCompressPhotoProcessor.maxSide,
}) {
  final longer = math.max(width, height);
  final shorter = math.min(width, height);
  if (longer <= maxSide) return maxSide; // já cabe: o plugin não amplia.
  return math.max(1, (maxSide * shorter / longer).floor());
}

/// Pasta das fotos comprimidas do relato em andamento.
///
/// Fica fora do cache de propósito: com pouco espaço, o Android esvazia o
/// cache dos apps sozinho (a cada minuto) e a foto sumia entre a A.3 e o
/// envio na A.4 ("Uma das fotos não está mais disponível").
Future<Directory> reportPhotosDirectory() async {
  final base = await getApplicationSupportDirectory();
  return Directory('${base.path}/report_photos').create(recursive: true);
}

class ImageCompressPhotoProcessor implements PhotoProcessor {
  ImageCompressPhotoProcessor({
    Future<Directory> Function()? photosDirectory,
    DateTime Function()? now,
  }) : _photosDirectory = photosDirectory ?? reportPhotosDirectory,
       _now = now ?? DateTime.now;

  static const int maxSide = 1920;
  static const int quality = 80;

  /// Sobras mais antigas que isso (relato abandonado com o app fechado no
  /// meio) são apagadas na primeira foto processada.
  static const Duration staleAfter = Duration(days: 1);

  final Future<Directory> Function() _photosDirectory;
  final DateTime Function() _now;
  int _counter = 0;
  bool _purged = false;

  @override
  Future<ReportPhoto> process(String sourcePath) async {
    try {
      final (width, height) = await _dimensions(sourcePath);
      final minSide = compressionMinSide(width: width, height: height);

      final dir = await _photosDirectory();
      if (!_purged) {
        _purged = true;
        await purgeStale(dir);
      }
      final target =
          '${dir.path}/report_${DateTime.now().microsecondsSinceEpoch}_'
          '${_counter++}.jpg';

      // Sempre JPEG: converte HEIC/PNG/WebP e corrige a rotação EXIF.
      final result = await FlutterImageCompress.compressAndGetFile(
        sourcePath,
        target,
        minWidth: minSide,
        minHeight: minSide,
        quality: quality,
        format: CompressFormat.jpeg,
        keepExif: false,
      );
      if (result == null) throw const PhotoProcessingException();

      return ReportPhoto(path: result.path, sizeInBytes: await result.length());
    } on PhotoProcessingException {
      rethrow;
    } catch (e) {
      throw PhotoProcessingException(e);
    }
  }

  @override
  Future<void> discard(ReportPhoto photo) async {
    try {
      final file = File(photo.path);
      if (await file.exists()) await file.delete();
    } on FileSystemException {
      // Se falhar, `purgeStale` remove numa próxima vez.
    }
  }

  /// Apaga fotos de relatos antigos que ficaram para trás em [dir].
  @visibleForTesting
  Future<void> purgeStale(Directory dir) async {
    final limit = _now().subtract(staleAfter);
    try {
      await for (final entity in dir.list()) {
        if (entity is File && (await entity.lastModified()).isBefore(limit)) {
          await entity.delete();
        }
      }
    } on FileSystemException {
      // Limpeza oportunista: tenta de novo na próxima abertura do app.
    }
  }

  /// Lê só o cabeçalho da imagem (sem decodificar os pixels de uma foto de
  /// 12 MP).
  Future<(int, int)> _dimensions(String path) async {
    final buffer = await ui.ImmutableBuffer.fromFilePath(path);
    try {
      final descriptor = await ui.ImageDescriptor.encoded(buffer);
      final size = (descriptor.width, descriptor.height);
      descriptor.dispose();
      return size;
    } finally {
      buffer.dispose();
    }
  }
}
