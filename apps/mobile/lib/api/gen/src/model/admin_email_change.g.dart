// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_email_change.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminEmailChange extends AdminEmailChange {
  @override
  final String reason;
  @override
  final String newEmail;

  factory _$AdminEmailChange([void Function(AdminEmailChangeBuilder)? updates]) =>
      (AdminEmailChangeBuilder()..update(updates))._build();

  _$AdminEmailChange._({required this.reason, required this.newEmail}) : super._();
  @override
  AdminEmailChange rebuild(void Function(AdminEmailChangeBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminEmailChangeBuilder toBuilder() => AdminEmailChangeBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminEmailChange && reason == other.reason && newEmail == other.newEmail;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, newEmail.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminEmailChange')
          ..add('reason', reason)
          ..add('newEmail', newEmail))
        .toString();
  }
}

class AdminEmailChangeBuilder implements Builder<AdminEmailChange, AdminEmailChangeBuilder> {
  _$AdminEmailChange? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  String? _newEmail;
  String? get newEmail => _$this._newEmail;
  set newEmail(String? newEmail) => _$this._newEmail = newEmail;

  AdminEmailChangeBuilder() {
    AdminEmailChange._defaults(this);
  }

  AdminEmailChangeBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _newEmail = $v.newEmail;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminEmailChange other) {
    _$v = other as _$AdminEmailChange;
  }

  @override
  void update(void Function(AdminEmailChangeBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminEmailChange build() => _build();

  _$AdminEmailChange _build() {
    final _$result =
        _$v ??
        _$AdminEmailChange._(
          reason: BuiltValueNullFieldError.checkNotNull(reason, r'AdminEmailChange', 'reason'),
          newEmail: BuiltValueNullFieldError.checkNotNull(
            newEmail,
            r'AdminEmailChange',
            'newEmail',
          ),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
