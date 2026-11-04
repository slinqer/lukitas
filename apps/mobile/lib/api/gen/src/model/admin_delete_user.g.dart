// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_delete_user.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminDeleteUser extends AdminDeleteUser {
  @override
  final String reason;
  @override
  final String confirm;

  factory _$AdminDeleteUser([void Function(AdminDeleteUserBuilder)? updates]) =>
      (AdminDeleteUserBuilder()..update(updates))._build();

  _$AdminDeleteUser._({required this.reason, required this.confirm}) : super._();
  @override
  AdminDeleteUser rebuild(void Function(AdminDeleteUserBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminDeleteUserBuilder toBuilder() => AdminDeleteUserBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminDeleteUser && reason == other.reason && confirm == other.confirm;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, confirm.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminDeleteUser')
          ..add('reason', reason)
          ..add('confirm', confirm))
        .toString();
  }
}

class AdminDeleteUserBuilder implements Builder<AdminDeleteUser, AdminDeleteUserBuilder> {
  _$AdminDeleteUser? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _confirm;
  String? get confirm => _$this._confirm;
  set confirm(String? confirm) => _$this._confirm = confirm;

  AdminDeleteUserBuilder() {
    AdminDeleteUser._defaults(this);
  }

  AdminDeleteUserBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _confirm = $v.confirm;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminDeleteUser other) {
    _$v = other as _$AdminDeleteUser;
  }

  @override
  void update(void Function(AdminDeleteUserBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminDeleteUser build() => _build();

  _$AdminDeleteUser _build() {
    final _$result =
        _$v ??
        _$AdminDeleteUser._(
          reason: BuiltValueNullFieldError.checkNotNull(reason, r'AdminDeleteUser', 'reason'),
          confirm: BuiltValueNullFieldError.checkNotNull(confirm, r'AdminDeleteUser', 'confirm'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
