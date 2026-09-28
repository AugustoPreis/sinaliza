import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_colors.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';

/// Origem das imagens (com cache em disco). Substituível nos testes.
@visibleForTesting
ImageProvider Function(String url) ticketPhotoProvider =
    CachedNetworkImageProvider.new;

/// Grade de miniaturas; toque abre o visualizador em tela cheia.
class TicketPhotoGrid extends StatelessWidget {
  const TicketPhotoGrid({required this.photos, super.key});

  final List<TicketPhoto> photos;

  void _open(BuildContext context, int index) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => TicketPhotoViewer(photos: photos, initialIndex: index),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: photos.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: AppSpacing.sm,
        crossAxisSpacing: AppSpacing.sm,
      ),
      itemBuilder: (context, index) => Semantics(
        button: true,
        label: AppStrings.detailPhotoSemantics(index + 1, photos.length),
        excludeSemantics: true,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.control),
          child: Material(
            color: context.colors.surfaceContainerHighest,
            child: InkWell(
              onTap: () => _open(context, index),
              child: Hero(
                tag: photos[index].id,
                child: Image(
                  image: ResizeImage.resizeIfNeeded(
                    300,
                    null,
                    ticketPhotoProvider(photos[index].url),
                  ),
                  fit: BoxFit.cover,
                  // Enquanto carrega, aparece o fundo cinza do Material.
                  errorBuilder: (context, _, _) => const _PhotoError(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tela cheia com zoom (pinça/duplo toque) e deslize entre as fotos.
class TicketPhotoViewer extends StatefulWidget {
  const TicketPhotoViewer({
    required this.photos,
    this.initialIndex = 0,
    super.key,
  });

  final List<TicketPhoto> photos;
  final int initialIndex;

  @override
  State<TicketPhotoViewer> createState() => _TicketPhotoViewerState();
}

class _TicketPhotoViewerState extends State<TicketPhotoViewer> {
  late int _index = widget.initialIndex;
  late final _controller = PageController(initialPage: widget.initialIndex);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const background = AppColors.photoViewerBackground;
    const foreground = AppColors.onPhotoViewer;

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: background,
        foregroundColor: foreground,
        // Fundo preto: ícones claros na barra de status (o tema usa escuros).
        systemOverlayStyle: SystemUiOverlayStyle.light,
        title: Text(
          AppStrings.detailPhotoViewerTitle(_index + 1, widget.photos.length),
          style: const TextStyle(color: foreground),
        ),
      ),
      body: PhotoViewGallery.builder(
        pageController: _controller,
        itemCount: widget.photos.length,
        onPageChanged: (index) => setState(() => _index = index),
        backgroundDecoration: const BoxDecoration(color: background),
        loadingBuilder: (_, _) =>
            const Center(child: CircularProgressIndicator(color: foreground)),
        builder: (context, index) {
          final photo = widget.photos[index];
          return PhotoViewGalleryPageOptions(
            imageProvider: ticketPhotoProvider(photo.url),
            heroAttributes: PhotoViewHeroAttributes(tag: photo.id),
            minScale: PhotoViewComputedScale.contained,
            maxScale: PhotoViewComputedScale.covered * 4,
            errorBuilder: (_, _, _) => const Center(
              child: Text(
                AppStrings.detailPhotoUnavailable,
                style: TextStyle(color: foreground),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PhotoError extends StatelessWidget {
  const _PhotoError();

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: AppStrings.detailPhotoUnavailable,
      child: Icon(
        Icons.broken_image_outlined,
        color: context.colors.onSurfaceVariant,
      ),
    );
  }
}
