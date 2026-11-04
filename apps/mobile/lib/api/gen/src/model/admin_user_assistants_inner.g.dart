// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user_assistants_inner.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUserAssistantsInner extends AdminUserAssistantsInner {
  @override
  final String clientId;
  @override
  final String name;
  @override
  final String consentedAt;

  factory _$AdminUserAssistantsInner([void Function(AdminUserAssistantsInnerBuilder)? updates]) =>
      (AdminUserAssistantsInnerBuilder()..update(updates))._build();

  _$AdminUserAssistantsInner._({
    required this.clientId,
    required this.name,
    required this.consentedAt,
  }) : super._();
  @override
  AdminUserAssistantsInner rebuild(void Function(AdminUserAssistantsInnerBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserAssistantsInnerBuilder toBuilder() => AdminUserAssistantsInnerBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUserAssistantsInner &&
        clientId == other.clientId &&
        name == other.name &&
        consentedAt == other.consentedAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, clientId.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, consentedAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminUserAssistantsInner')
          ..add('clientId', clientId)
          ..add('name', name)
          ..add('consentedAt', consentedAt))
        .toString();
  }
}

class AdminUserAssistantsInnerBuilder
    implements Builder<AdminUserAssistantsInner, AdminUserAssistantsInnerBuilder> {
  _$AdminUserAssistantsInner? _$v;

  String? _clientId;
  String? get clientId => _$this._clientId;
  set clientId(String? clientId) => _$this._clientId = clientId;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _consentedAt;
  String? get consentedAt => _$this._consentedAt;
  set consentedAt(String? consentedAt) => _$this._consentedAt = consentedAt;

  AdminUserAssistantsInnerBuilder() {
    AdminUserAssistantsInner._defaults(this);
  }

  AdminUserAssistantsInnerBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _clientId = $v.clientId;
      _name = $v.name;
      _consentedAt = $v.consentedAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUserAssistantsInner other) {
    _$v = other as _$AdminUserAssistantsInner;
  }

  @override
  void update(void Function(AdminUserAssistantsInnerBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUserAssistantsInner build() => _build();

  _$AdminUserAssistantsInner _build() {
    final _$result =
        _$v ??
        _$AdminUserAssistantsInner._(
          clientId: BuiltValueNullFieldError.checkNotNull(
            clientId,
            r'AdminUserAssistantsInner',
            'clientId',
          ),
          name: BuiltValueNullFieldError.checkNotNull(name, r'AdminUserAssistantsInner', 'name'),
          consentedAt: BuiltValueNullFieldError.checkNotNull(
            consentedAt,
            r'AdminUserAssistantsInner',
            'consentedAt',
          ),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
