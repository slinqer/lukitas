// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_capture_currency.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateCaptureCurrency extends CreateCaptureCurrency {
  @override
  final AnyOf anyOf;

  factory _$CreateCaptureCurrency([void Function(CreateCaptureCurrencyBuilder)? updates]) =>
      (CreateCaptureCurrencyBuilder()..update(updates))._build();

  _$CreateCaptureCurrency._({required this.anyOf}) : super._();
  @override
  CreateCaptureCurrency rebuild(void Function(CreateCaptureCurrencyBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateCaptureCurrencyBuilder toBuilder() => CreateCaptureCurrencyBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateCaptureCurrency && anyOf == other.anyOf;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, anyOf.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreateCaptureCurrency')..add('anyOf', anyOf)).toString();
  }
}

class CreateCaptureCurrencyBuilder
    implements Builder<CreateCaptureCurrency, CreateCaptureCurrencyBuilder> {
  _$CreateCaptureCurrency? _$v;

  AnyOf? _anyOf;
  AnyOf? get anyOf => _$this._anyOf;
  set anyOf(AnyOf? anyOf) => _$this._anyOf = anyOf;

  CreateCaptureCurrencyBuilder() {
    CreateCaptureCurrency._defaults(this);
  }

  CreateCaptureCurrencyBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _anyOf = $v.anyOf;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateCaptureCurrency other) {
    _$v = other as _$CreateCaptureCurrency;
  }

  @override
  void update(void Function(CreateCaptureCurrencyBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateCaptureCurrency build() => _build();

  _$CreateCaptureCurrency _build() {
    final _$result =
        _$v ??
        _$CreateCaptureCurrency._(
          anyOf: BuiltValueNullFieldError.checkNotNull(anyOf, r'CreateCaptureCurrency', 'anyOf'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
