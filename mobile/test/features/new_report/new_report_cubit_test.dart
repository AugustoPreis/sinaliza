import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_cubit.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';

void main() {
  late MockLocationsRepository locations;
  late MockClassificationRepository classification;
  late FakePhotoPicker picker;
  late FakePhotoProcessor processor;
  late NewReportCubit cubit;

  const ti = ClassificationResult(
    automaticSector: SectorRef(id: 's1', name: 'TI'),
    confidence: 0.9,
  );

  setUp(() {
    locations = MockLocationsRepository();
    classification = MockClassificationRepository();
    picker = FakePhotoPicker();
    processor = FakePhotoProcessor();
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [bloco, biblioteca]);
    when(() => classification.preview(any())).thenAnswer((_) async => ti);
    cubit = NewReportCubit(
      locations: locations,
      classification: classification,
      photoPicker: picker,
      photoProcessor: processor,
    );
  });

  tearDown(() => cubit.close());

  Future<void> fillValid() async {
    await cubit.loadLocations();
    cubit
      ..descriptionChanged('  O projetor da sala 101 não liga  ')
      ..selectBuilding(bloco)
      ..selectEnvironment(bloco.environments.first);
  }

  group('validação', () {
    test('sem descrição ou sem local não continua', () async {
      await cubit.loadLocations();
      expect(cubit.state.canContinue, isFalse);

      cubit.descriptionChanged('   ');
      cubit
        ..selectBuilding(bloco)
        ..selectEnvironment(bloco.environments.first);
      expect(cubit.state.isDescriptionValid, isFalse);
      expect(cubit.state.canContinue, isFalse);

      cubit.descriptionChanged('Vazamento');
      expect(cubit.state.canContinue, isTrue);

      expect(
        await NewReportCubit(
          locations: locations,
          classification: classification,
          photoPicker: picker,
          photoProcessor: processor,
        ).classify(),
        isFalse,
      );
      verifyNever(() => classification.preview(any()));
    });

    test('descrição acima de 2000 caracteres é inválida', () {
      cubit.descriptionChanged('a' * 2001);
      expect(cubit.state.isDescriptionValid, isFalse);
      cubit.descriptionChanged('a' * 2000);
      expect(cubit.state.isDescriptionValid, isTrue);
    });

    test('trocar o prédio limpa o ambiente; manter o mesmo não', () async {
      await fillValid();
      cubit.selectBuilding(bloco);
      expect(cubit.state.environment, isNotNull);

      cubit.selectBuilding(biblioteca);
      expect(cubit.state.environment, isNull);
      expect(cubit.state.canContinue, isFalse);
    });

    test('hasUnsavedData', () {
      expect(cubit.state.hasUnsavedData, isFalse);
      cubit.descriptionChanged('x');
      expect(cubit.state.hasUnsavedData, isTrue);
    });
  });

  group('locais', () {
    test('carrega os prédios', () async {
      await cubit.loadLocations();
      expect(cubit.state.locationsStatus, LocationsStatus.ready);
      expect(cubit.state.buildings, [bloco, biblioteca]);
    });

    test(
      'lista vazia/erro -> falha com mensagem e retry força recarga',
      () async {
        when(
          () =>
              locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
        ).thenThrow(
          const ConfigurationFailure(AppStrings.noLocationsConfigured),
        );

        await cubit.loadLocations();
        expect(cubit.state.locationsStatus, LocationsStatus.failure);
        expect(
          cubit.state.locationsFailure?.message,
          AppStrings.noLocationsConfigured,
        );

        when(
          () => locations.getBuildings(forceRefresh: true),
        ).thenAnswer((_) async => [bloco]);
        await cubit.loadLocations(forceRefresh: true);
        expect(cubit.state.buildings, [bloco]);
      },
    );
  });

  group('classificação', () {
    test('envia só a descrição (sem espaços) e guarda o setor', () async {
      await fillValid();
      expect(await cubit.classify(), isTrue);

      verify(
        () => classification.preview('O projetor da sala 101 não liga'),
      ).called(1);
      expect(cubit.state.classification, ti);
      expect(cubit.state.isClassifying, isFalse);
    });

    test('descrição igual reaproveita; alterada classifica de novo', () async {
      await fillValid();
      await cubit.classify();
      await cubit.classify(); // voltou da A.4 sem mudar nada
      verify(() => classification.preview(any())).called(1);

      cubit.descriptionChanged('Vazamento no banheiro');
      expect(cubit.state.needsClassification, isTrue);
      await cubit.classify();
      verify(() => classification.preview('Vazamento no banheiro')).called(1);
    });

    test('erro mantém tudo preenchido e permite tentar de novo', () async {
      await fillValid();
      await cubit.addPhotos(PhotoSource.camera); // sem foto: câmera cancelada
      when(
        () => classification.preview(any()),
      ).thenThrow(const NetworkFailure());

      expect(await cubit.classify(), isFalse);
      final state = cubit.state;
      expect(state.classifyStatus, ClassifyStatus.failure);
      expect(state.classifyFailure, const NetworkFailure());
      expect(state.description, contains('projetor'));
      expect(state.environment, bloco.environments.first);
      expect(state.canContinue, isTrue);

      when(() => classification.preview(any())).thenAnswer((_) async => ti);
      expect(await cubit.classify(), isTrue);
      expect(cubit.state.classifyFailure, isNull);
    });
  });

  group('fotos', () {
    test('fotos chegam ao estado já comprimidas', () async {
      picker.galleryResult = ['/dcim/12mp_1.heic', '/dcim/12mp_2.jpg'];

      await cubit.addPhotos(PhotoSource.gallery);

      expect(processor.processed, ['/dcim/12mp_1.heic', '/dcim/12mp_2.jpg']);
      expect(cubit.state.photos.map((p) => p.path), [
        '/dcim/12mp_1.heic.compressed.jpg',
        '/dcim/12mp_2.jpg.compressed.jpg',
      ]);
      expect(
        cubit.state.photos.every((p) => p.mimeType == 'image/jpeg'),
        isTrue,
      );
      expect(cubit.state.isProcessingPhotos, isFalse);
    });

    test('pede à galeria só o que falta até 5 e corta o excesso', () async {
      picker.galleryResult = ['/a', '/b', '/c'];
      await cubit.addPhotos(PhotoSource.gallery);
      expect(picker.lastLimit, 5);

      picker.galleryResult = [
        '/d',
        '/e',
        '/f',
        '/g',
      ]; // galeria ignorou o limite
      await cubit.addPhotos(PhotoSource.gallery);
      expect(picker.lastLimit, 2);
      expect(cubit.state.photos, hasLength(5));
      expect(
        (cubit.state.notice! as PhotoNotice).message,
        AppStrings.reportPhotoLimitPartial(5),
      );

      await cubit.addPhotos(PhotoSource.camera);
      expect(
        (cubit.state.notice! as PhotoNotice).message,
        AppStrings.reportPhotoLimitReached,
      );
    });

    test('câmera adiciona uma foto; cancelar não muda nada', () async {
      await cubit.addPhotos(PhotoSource.camera);
      expect(cubit.state.photos, isEmpty);

      picker.cameraResult = '/camera/1.jpg';
      await cubit.addPhotos(PhotoSource.camera);
      expect(cubit.state.photos.single.path, '/camera/1.jpg.compressed.jpg');
    });

    test('permissão negada gera aviso com a origem', () async {
      picker.error = const PhotoPermissionDenied(PhotoSource.camera);
      await cubit.addPhotos(PhotoSource.camera);

      expect(
        cubit.state.notice,
        isA<PermissionDeniedNotice>().having(
          (n) => n.source,
          'source',
          PhotoSource.camera,
        ),
      );
    });

    test('falha ao comprimir uma foto mantém as outras e avisa', () async {
      picker.galleryResult = ['/ok', '/corrompida'];
      processor.failing.add('/corrompida');

      await cubit.addPhotos(PhotoSource.gallery);

      expect(cubit.state.photos, hasLength(1));
      expect(
        (cubit.state.notice! as PhotoNotice).message,
        AppStrings.reportPhotoFailed,
      );
    });

    test('remover apaga o arquivo temporário; fechar apaga o resto', () async {
      picker.galleryResult = ['/a', '/b'];
      await cubit.addPhotos(PhotoSource.gallery);

      final first = cubit.state.photos.first;
      cubit.removePhoto(first);
      expect(cubit.state.photos, hasLength(1));
      expect(processor.discarded, [first]);

      final remaining = cubit.state.photos.single;
      await cubit.close();
      expect(processor.discarded, [first, remaining]);
    });

    test('avisos repetidos são distintos (a tela mostra de novo)', () async {
      picker.galleryResult = ['/1', '/2', '/3', '/4', '/5'];
      await cubit.addPhotos(PhotoSource.gallery);
      await cubit.addPhotos(PhotoSource.camera);
      final first = cubit.state.notice;
      await cubit.addPhotos(PhotoSource.camera);
      expect(cubit.state.notice, isNot(first));
    });
  });
}
