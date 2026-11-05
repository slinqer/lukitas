// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'passkey_assertion_response.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PasskeyAssertionResponse extends PasskeyAssertionResponse {
  @override
  final String clientDataJSON;
  @override
  final String authenticatorData;
  @override
  final String signature;
  @override
  final String? userHandle;

  factory _$PasskeyAssertionResponse([void Function(PasskeyAssertionResponseBuilder)? updates]) =>
      (PasskeyAssertionResponseBuilder()..update(updates))._build();

  _$PasskeyAssertionResponse._({
    required this.clientDataJSON,
    required this.authenticatorData,
    required this.signature,
    this.userHandle,
  }) : super._();
  @override
  PasskeyAssertionResponse rebuild(void Function(PasskeyAssertionResponseBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PasskeyAssertionResponseBuilder toBuilder() => PasskeyAssertionResponseBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PasskeyAssertionResponse &&
        clientDataJSON == other.clientDataJSON &&
        authenticatorData == other.authenticatorData &&
        signature == other.signature &&
        userHandle == other.userHandle;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, clientDataJSON.hashCode);
    _$hash = $jc(_$hash, authenticatorData.hashCode);
    _$hash = $jc(_$hash, signature.hashCode);
    _$hash = $jc(_$hash, userHandle.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PasskeyAssertionResponse')
          ..add('clientDataJSON', clientDataJSON)
          ..add('authenticatorData', authenticatorData)
          ..add('signature', signature)
          ..add('userHandle', userHandle))
        .toString();
  }
}

class PasskeyAssertionResponseBuilder
    implements Builder<PasskeyAssertionResponse, PasskeyAssertionResponseBuilder> {
  _$PasskeyAssertionResponse? _$v;

  String? _clientDataJSON;
  String? get clientDataJSON => _$this._clientDataJSON;
  set clientDataJSON(String? clientDataJSON) => _$this._clientDataJSON = clientDataJSON;

  String? _authenticatorData;
  String? get authenticatorData => _$this._authenticatorData;
  set authenticatorData(String? authenticatorData) => _$this._authenticatorData = authenticatorData;

  String? _signature;
  String? get signature => _$this._signature;
  set signature(String? signature) => _$this._signature = signature;

  String? _userHandle;
  String? get userHandle => _$this._userHandle;
  set userHandle(String? userHandle) => _$this._userHandle = userHandle;

  PasskeyAssertionResponseBuilder() {
    PasskeyAssertionResponse._defaults(this);
  }

  PasskeyAssertionResponseBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _clientDataJSON = $v.clientDataJSON;
      _authenticatorData = $v.authenticatorData;
      _signature = $v.signature;
      _userHandle = $v.userHandle;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PasskeyAssertionResponse other) {
    _$v = other as _$PasskeyAssertionResponse;
  }

  @override
  void update(void Function(PasskeyAssertionResponseBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PasskeyAssertionResponse build() => _build();

  _$PasskeyAssertionResponse _build() {
    final _$result =
        _$v ??
        _$PasskeyAssertionResponse._(
          clientDataJSON: BuiltValueNullFieldError.checkNotNull(
            clientDataJSON,
            r'PasskeyAssertionResponse',
            'clientDataJSON',
          ),
          authenticatorData: BuiltValueNullFieldError.checkNotNull(
            authenticatorData,
            r'PasskeyAssertionResponse',
            'authenticatorData',
          ),
          signature: BuiltValueNullFieldError.checkNotNull(
            signature,
            r'PasskeyAssertionResponse',
            'signature',
          ),
          userHandle: userHandle,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
