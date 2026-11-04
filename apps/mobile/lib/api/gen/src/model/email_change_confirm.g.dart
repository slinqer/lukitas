// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'email_change_confirm.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$EmailChangeConfirm extends EmailChangeConfirm {
  @override
  final String token;

  factory _$EmailChangeConfirm([void Function(EmailChangeConfirmBuilder)? updates]) =>
      (EmailChangeConfirmBuilder()..update(updates))._build();

  _$EmailChangeConfirm._({required this.token}) : super._();
  @override
  EmailChangeConfirm rebuild(void Function(EmailChangeConfirmBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  EmailChangeConfirmBuilder toBuilder() => EmailChangeConfirmBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is EmailChangeConfirm && token == other.token;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, token.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'EmailChangeConfirm')..add('token', token)).toString();
  }
}

class EmailChangeConfirmBuilder implements Builder<EmailChangeConfirm, EmailChangeConfirmBuilder> {
  _$EmailChangeConfirm? _$v;

  String? _token;
  String? get token => _$this._token;
  set token(String? token) => _$this._token = token;

  EmailChangeConfirmBuilder() {
    EmailChangeConfirm._defaults(this);
  }

  EmailChangeConfirmBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _token = $v.token;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(EmailChangeConfirm other) {
    _$v = other as _$EmailChangeConfirm;
  }

  @override
  void update(void Function(EmailChangeConfirmBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  EmailChangeConfirm build() => _build();

  _$EmailChangeConfirm _build() {
    final _$result =
        _$v ??
        _$EmailChangeConfirm._(
          token: BuiltValueNullFieldError.checkNotNull(token, r'EmailChangeConfirm', 'token'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
