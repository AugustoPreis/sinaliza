import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

/// Origem da foto.
enum PhotoSource { camera, gallery }

/// O usuário negou (ou o sistema bloqueou) o acesso à câmera/fotos.
class PhotoPermissionDenied implements Exception {
  const PhotoPermissionDenied(this.source);

  final PhotoSource source;
}

/// Seleção de fotos. Devolve caminhos de arquivos originais (sem compressão).
abstract interface class PhotoPicker {
  /// `null` se o usuário cancelar.
  Future<String?> takePhoto();

  /// Até [limit] fotos da galeria; lista vazia se cancelar.
  Future<List<String>> pickFromGallery({required int limit});
}

class ImagePickerPhotoPicker implements PhotoPicker {
  ImagePickerPhotoPicker([ImagePicker? picker])
    : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  // Códigos do image_picker quando o acesso é negado (iOS).
  static const _deniedCodes = {'camera_access_denied', 'photo_access_denied'};

  @override
  Future<String?> takePhoto() async {
    try {
      final file = await _picker.pickImage(source: ImageSource.camera);
      return file?.path;
    } on PlatformException catch (e) {
      if (_deniedCodes.contains(e.code)) {
        throw const PhotoPermissionDenied(PhotoSource.camera);
      }
      rethrow;
    }
  }

  @override
  Future<List<String>> pickFromGallery({required int limit}) async {
    try {
      // `pickMultiImage(limit:)` exige limit >= 2.
      if (limit <= 1) {
        final file = await _picker.pickImage(source: ImageSource.gallery);
        return [?file?.path];
      }
      final files = await _picker.pickMultiImage(limit: limit);
      return files.map((file) => file.path).toList();
    } on PlatformException catch (e) {
      if (_deniedCodes.contains(e.code)) {
        throw const PhotoPermissionDenied(PhotoSource.gallery);
      }
      rethrow;
    }
  }
}
