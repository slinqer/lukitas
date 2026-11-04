// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_passkeys_inner.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserPasskeysInner extends AdminUserPasskeysInner {
  @override
  final String id;
  @override
  final String? name;
  @override
  final String deviceType;
  @override
  final String? createdAt;

  factory _$AdminUserPasskeysInner([void Function(AdminUserPasskeysInnerBuilder)? updates]) =>
      (AdminUserPasskeysInnerBuilder()..update(updates))._build();

  _$AdminUserPasskeysInner._({
    required this.id,
    this.name,
    required this.deviceType,
    this.createdAt,
  }) : super._();
  @override
  AdminUserPasskeysInner rebuild(void Function(AdminUserPasskeysInnerBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserPasskeysInnerBuilder toBuilder() => AdminUserPasskeysInnerBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserPasskeysInner &&
        id == other.id &&
        name == other.name &&
        deviceType == other.deviceType &&
        createdAt == other.createdAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, deviceType.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminUserPasskeysInner')
          ..add('id', id)
          ..add('name', name)
          ..add('deviceType', deviceType)
          ..add('createdAt', createdAt))
        .toString();
  }
}

class AdminUserPasskeysInnerBuilder
    implements Builder<AdminUserPasskeysInner, AdminUserPasskeysInnerBuilder> {
  _$AdminUserPasskeysInner? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _deviceType;
  String? get deviceType => _$this._deviceType;
  set deviceType(String? deviceType) => _$this._deviceType = deviceType;

  String? _createdAt;
  String? get createdAt => _$this._createdAt;
  set createdAt(String? createdAt) => _$this._createdAt = createdAt;

  AdminUserPasskeysInnerBuilder() {
    AdminUserPasskeysInner._defaults(this);
  }

  AdminUserPasskeysInnerBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _deviceType = $v.deviceType;
      _createdAt = $v.createdAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserPasskeysInner other) {
    _$v = other as _$AdminUserPasskeysInner;
  }

  @override
  void update(void Function(AdminUserPasskeysInnerBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserPasskeysInner build() => _build();

  _$AdminUserPasskeysInner _build() {
    final _$result =
        _$v ??
        _$AdminUserPasskeysInner._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'AdminUserPasskeysInner', 'id'),
          name: name,
          deviceType: BuiltValueNullFieldError.checkNotNull(
            deviceType,
            r'AdminUserPasskeysInner',
            'deviceType',
          ),
          createdAt: createdAt,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
