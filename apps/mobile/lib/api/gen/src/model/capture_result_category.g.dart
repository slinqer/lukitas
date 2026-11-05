// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'capture_result_category.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CaptureResultCategory extends CaptureResultCategory {
  @override
  final String name;
  @override
  final bool fallback;

  factory _$CaptureResultCategory([void Function(CaptureResultCategoryBuilder)? updates]) =>
      (CaptureResultCategoryBuilder()..update(updates))._build();

  _$CaptureResultCategory._({required this.name, required this.fallback}) : super._();
  @override
  CaptureResultCategory rebuild(void Function(CaptureResultCategoryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CaptureResultCategoryBuilder toBuilder() => CaptureResultCategoryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CaptureResultCategory && name == other.name && fallback == other.fallback;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, fallback.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CaptureResultCategory')
          ..add('name', name)
          ..add('fallback', fallback))
        .toString();
  }
}

class CaptureResultCategoryBuilder
    implements Builder<CaptureResultCategory, CaptureResultCategoryBuilder> {
  _$CaptureResultCategory? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  bool? _fallback;
  bool? get fallback => _$this._fallback;
  set fallback(bool? fallback) => _$this._fallback = fallback;

  CaptureResultCategoryBuilder() {
    CaptureResultCategory._defaults(this);
  }

  CaptureResultCategoryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _fallback = $v.fallback;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CaptureResultCategory other) {
    _$v = other as _$CaptureResultCategory;
  }

  @override
  void update(void Function(CaptureResultCategoryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CaptureResultCategory build() => _build();

  _$CaptureResultCategory _build() {
    final _$result =
        _$v ??
        _$CaptureResultCategory._(
          name: BuiltValueNullFieldError.checkNotNull(name, r'CaptureResultCategory', 'name'),
          fallback: BuiltValueNullFieldError.checkNotNull(
            fallback,
            r'CaptureResultCategory',
            'fallback',
          ),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
