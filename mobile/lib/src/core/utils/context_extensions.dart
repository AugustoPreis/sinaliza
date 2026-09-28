import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

extension MaybeReadContext on BuildContext {
  /// Como `read<T>()`, mas devolve `null` se não houver provider de [T].
  /// Para dependências opcionais (ex.: sinais que só existem no app completo).
  T? maybeRead<T>() {
    try {
      return read<T>();
    } on ProviderNotFoundException {
      return null;
    }
  }
}
