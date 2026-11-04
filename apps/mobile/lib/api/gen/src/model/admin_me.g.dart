// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_me.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminMe extends AdminMe {
  @override
  final String id;
  @override
  final String verifiedUntil;

  factory _$AdminMe([void Function(AdminMeBuilder)? updates]) =>
      (AdminMeBuilder()..update(updates))._build();

  _$AdminMe._({required this.id, required this.verifiedUntil}) : super._();
  @override
  AdminMe rebuild(void Function(AdminMeBuilder) updates) => (toBuilder()..update(updates)).build();

  @override
  AdminMeBuilder toBuilder() => AdminMeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminMe && id == other.id && verifiedUntil == other.verifiedUntil;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, verifiedUntil.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminMe')
          ..add('id', id)
          ..add('verifiedUntil', verifiedUntil))
        .toString();
  }
}

class AdminMeBuilder implements Builder<AdminMe, AdminMeBuilder> {
  _$AdminMe? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _verifiedUntil;
  String? get verifiedUntil => _$this._verifiedUntil;
  set verifiedUntil(String? verifiedUntil) => _$this._verifiedUntil = verifiedUntil;

  AdminMeBuilder() {
    AdminMe._defaults(this);
  }

  AdminMeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _verifiedUntil = $v.verifiedUntil;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminMe other) {
    _$v = other as _$AdminMe;
  }

  @override
  void update(void Function(AdminMeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminMe build() => _build();

  _$AdminMe _build() {
    final _$result =
        _$v ??
        _$AdminMe._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'AdminMe', 'id'),
          verifiedUntil: BuiltValueNullFieldError.checkNotNull(
            verifiedUntil,
            r'AdminMe',
            'verifiedUntil',
          ),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
