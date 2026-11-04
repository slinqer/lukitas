// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'passkey_request_options.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PasskeyRequestOptions extends PasskeyRequestOptions {
  @override
  final String challenge;
  @override
  final num? timeout;
  @override
  final String? rpId;
  @override
  final BuiltList<PasskeyRequestOptionsAllowCredentialsInner>? allowCredentials;
  @override
  final String? userVerification;
  @override
  final BuiltMap<String, JsonObject?>? extensions;

  factory _$PasskeyRequestOptions([void Function(PasskeyRequestOptionsBuilder)? updates]) =>
      (PasskeyRequestOptionsBuilder()..update(updates))._build();

  _$PasskeyRequestOptions._({
    required this.challenge,
    this.timeout,
    this.rpId,
    this.allowCredentials,
    this.userVerification,
    this.extensions,
  }) : super._();
  @override
  PasskeyRequestOptions rebuild(void Function(PasskeyRequestOptionsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PasskeyRequestOptionsBuilder toBuilder() => PasskeyRequestOptionsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PasskeyRequestOptions &&
        challenge == other.challenge &&
        timeout == other.timeout &&
        rpId == other.rpId &&
        allowCredentials == other.allowCredentials &&
        userVerification == other.userVerification &&
        extensions == other.extensions;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, challenge.hashCode);
    _$hash = $jc(_$hash, timeout.hashCode);
    _$hash = $jc(_$hash, rpId.hashCode);
    _$hash = $jc(_$hash, allowCredentials.hashCode);
    _$hash = $jc(_$hash, userVerification.hashCode);
    _$hash = $jc(_$hash, extensions.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PasskeyRequestOptions')
          ..add('challenge', challenge)
          ..add('timeout', timeout)
          ..add('rpId', rpId)
          ..add('allowCredentials', allowCredentials)
          ..add('userVerification', userVerification)
          ..add('extensions', extensions))
        .toString();
  }
}

class PasskeyRequestOptionsBuilder
    implements Builder<PasskeyRequestOptions, PasskeyRequestOptionsBuilder> {
  _$PasskeyRequestOptions? _$v;

  String? _challenge;
  String? get challenge => _$this._challenge;
  set challenge(String? challenge) => _$this._challenge = challenge;

  num? _timeout;
  num? get timeout => _$this._timeout;
  set timeout(num? timeout) => _$this._timeout = timeout;

  String? _rpId;
  String? get rpId => _$this._rpId;
  set rpId(String? rpId) => _$this._rpId = rpId;

  ListBuilder<PasskeyRequestOptionsAllowCredentialsInner>? _allowCredentials;
  ListBuilder<PasskeyRequestOptionsAllowCredentialsInner> get allowCredentials =>
      _$this._allowCredentials ??= ListBuilder<PasskeyRequestOptionsAllowCredentialsInner>();
  set allowCredentials(ListBuilder<PasskeyRequestOptionsAllowCredentialsInner>? allowCredentials) =>
      _$this._allowCredentials = allowCredentials;

  String? _userVerification;
  String? get userVerification => _$this._userVerification;
  set userVerification(String? userVerification) => _$this._userVerification = userVerification;

  MapBuilder<String, JsonObject?>? _extensions;
  MapBuilder<String, JsonObject?> get extensions =>
      _$this._extensions ??= MapBuilder<String, JsonObject?>();
  set extensions(MapBuilder<String, JsonObject?>? extensions) => _$this._extensions = extensions;

  PasskeyRequestOptionsBuilder() {
    PasskeyRequestOptions._defaults(this);
  }

  PasskeyRequestOptionsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _challenge = $v.challenge;
      _timeout = $v.timeout;
      _rpId = $v.rpId;
      _allowCredentials = $v.allowCredentials?.toBuilder();
      _userVerification = $v.userVerification;
      _extensions = $v.extensions?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PasskeyRequestOptions other) {
    _$v = other as _$PasskeyRequestOptions;
  }

  @override
  void update(void Function(PasskeyRequestOptionsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PasskeyRequestOptions build() => _build();

  _$PasskeyRequestOptions _build() {
    _$PasskeyRequestOptions _$result;
    try {
      _$result =
          _$v ??
          _$PasskeyRequestOptions._(
            challenge: BuiltValueNullFieldError.checkNotNull(
              challenge,
              r'PasskeyRequestOptions',
              'challenge',
            ),
            timeout: timeout,
            rpId: rpId,
            allowCredentials: _allowCredentials?.build(),
            userVerification: userVerification,
            extensions: _extensions?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'allowCredentials';
        _allowCredentials?.build();

        _$failedField = 'extensions';
        _extensions?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'PasskeyRequestOptions', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
