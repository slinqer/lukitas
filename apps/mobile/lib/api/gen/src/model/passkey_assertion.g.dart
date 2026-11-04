// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'passkey_assertion.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PasskeyAssertionTypeEnum _$passkeyAssertionTypeEnum_publicKey =
    const PasskeyAssertionTypeEnum._('publicKey');

PasskeyAssertionTypeEnum _$passkeyAssertionTypeEnumValueOf(String name) {
  switch (name) {
    case 'publicKey':
      return _$passkeyAssertionTypeEnum_publicKey;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<PasskeyAssertionTypeEnum> _$passkeyAssertionTypeEnumValues =
    BuiltSet<PasskeyAssertionTypeEnum>(const <PasskeyAssertionTypeEnum>[
      _$passkeyAssertionTypeEnum_publicKey,
    ]);

const PasskeyAssertionAuthenticatorAttachmentEnum
_$passkeyAssertionAuthenticatorAttachmentEnum_platform =
    const PasskeyAssertionAuthenticatorAttachmentEnum._('platform');
const PasskeyAssertionAuthenticatorAttachmentEnum
_$passkeyAssertionAuthenticatorAttachmentEnum_crossPlatform =
    const PasskeyAssertionAuthenticatorAttachmentEnum._('crossPlatform');

PasskeyAssertionAuthenticatorAttachmentEnum _$passkeyAssertionAuthenticatorAttachmentEnumValueOf(
  String name,
) {
  switch (name) {
    case 'platform':
      return _$passkeyAssertionAuthenticatorAttachmentEnum_platform;
    case 'crossPlatform':
      return _$passkeyAssertionAuthenticatorAttachmentEnum_crossPlatform;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<PasskeyAssertionAuthenticatorAttachmentEnum>
_$passkeyAssertionAuthenticatorAttachmentEnumValues =
    BuiltSet<PasskeyAssertionAuthenticatorAttachmentEnum>(
      const <PasskeyAssertionAuthenticatorAttachmentEnum>[
        _$passkeyAssertionAuthenticatorAttachmentEnum_platform,
        _$passkeyAssertionAuthenticatorAttachmentEnum_crossPlatform,
      ],
    );

Serializer<PasskeyAssertionTypeEnum> _$passkeyAssertionTypeEnumSerializer =
    _$PasskeyAssertionTypeEnumSerializer();
Serializer<PasskeyAssertionAuthenticatorAttachmentEnum>
_$passkeyAssertionAuthenticatorAttachmentEnumSerializer =
    _$PasskeyAssertionAuthenticatorAttachmentEnumSerializer();

class _$PasskeyAssertionTypeEnumSerializer
    implements PrimitiveSerializer<PasskeyAssertionTypeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{'publicKey': 'public-key'};
  static const Map<Object, String> _fromWire = const <Object, String>{'public-key': 'publicKey'};

  @override
  final Iterable<Type> types = const <Type>[PasskeyAssertionTypeEnum];
  @override
  final String wireName = 'PasskeyAssertionTypeEnum';

  @override
  Object serialize(
    Serializers serializers,
    PasskeyAssertionTypeEnum object, {
    FullType specifiedType = FullType.unspecified,
  }) => _toWire[object.name] ?? object.name;

  @override
  PasskeyAssertionTypeEnum deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) => PasskeyAssertionTypeEnum.valueOf(
    _fromWire[serialized] ?? (serialized is String ? serialized : ''),
  );
}

class _$PasskeyAssertionAuthenticatorAttachmentEnumSerializer
    implements PrimitiveSerializer<PasskeyAssertionAuthenticatorAttachmentEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'platform': 'platform',
    'crossPlatform': 'cross-platform',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'platform': 'platform',
    'cross-platform': 'crossPlatform',
  };

  @override
  final Iterable<Type> types = const <Type>[PasskeyAssertionAuthenticatorAttachmentEnum];
  @override
  final String wireName = 'PasskeyAssertionAuthenticatorAttachmentEnum';

  @override
  Object serialize(
    Serializers serializers,
    PasskeyAssertionAuthenticatorAttachmentEnum object, {
    FullType specifiedType = FullType.unspecified,
  }) => _toWire[object.name] ?? object.name;

  @override
  PasskeyAssertionAuthenticatorAttachmentEnum deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) => PasskeyAssertionAuthenticatorAttachmentEnum.valueOf(
    _fromWire[serialized] ?? (serialized is String ? serialized : ''),
  );
}

class _$PasskeyAssertion extends PasskeyAssertion {
  @override
  final String id;
  @override
  final String rawId;
  @override
  final PasskeyAssertionTypeEnum type;
  @override
  final PasskeyAssertionResponse response;
  @override
  final PasskeyAssertionAuthenticatorAttachmentEnum? authenticatorAttachment;
  @override
  final BuiltMap<String, JsonObject?> clientExtensionResults;

  factory _$PasskeyAssertion([void Function(PasskeyAssertionBuilder)? updates]) =>
      (PasskeyAssertionBuilder()..update(updates))._build();

  _$PasskeyAssertion._({
    required this.id,
    required this.rawId,
    required this.type,
    required this.response,
    this.authenticatorAttachment,
    required this.clientExtensionResults,
  }) : super._();
  @override
  PasskeyAssertion rebuild(void Function(PasskeyAssertionBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PasskeyAssertionBuilder toBuilder() => PasskeyAssertionBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PasskeyAssertion &&
        id == other.id &&
        rawId == other.rawId &&
        type == other.type &&
        response == other.response &&
        authenticatorAttachment == other.authenticatorAttachment &&
        clientExtensionResults == other.clientExtensionResults;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, rawId.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, response.hashCode);
    _$hash = $jc(_$hash, authenticatorAttachment.hashCode);
    _$hash = $jc(_$hash, clientExtensionResults.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PasskeyAssertion')
          ..add('id', id)
          ..add('rawId', rawId)
          ..add('type', type)
          ..add('response', response)
          ..add('authenticatorAttachment', authenticatorAttachment)
          ..add('clientExtensionResults', clientExtensionResults))
        .toString();
  }
}

class PasskeyAssertionBuilder implements Builder<PasskeyAssertion, PasskeyAssertionBuilder> {
  _$PasskeyAssertion? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _rawId;
  String? get rawId => _$this._rawId;
  set rawId(String? rawId) => _$this._rawId = rawId;

  PasskeyAssertionTypeEnum? _type;
  PasskeyAssertionTypeEnum? get type => _$this._type;
  set type(PasskeyAssertionTypeEnum? type) => _$this._type = type;

  PasskeyAssertionResponseBuilder? _response;
  PasskeyAssertionResponseBuilder get response =>
      _$this._response ??= PasskeyAssertionResponseBuilder();
  set response(PasskeyAssertionResponseBuilder? response) => _$this._response = response;

  PasskeyAssertionAuthenticatorAttachmentEnum? _authenticatorAttachment;
  PasskeyAssertionAuthenticatorAttachmentEnum? get authenticatorAttachment =>
      _$this._authenticatorAttachment;
  set authenticatorAttachment(
    PasskeyAssertionAuthenticatorAttachmentEnum? authenticatorAttachment,
  ) => _$this._authenticatorAttachment = authenticatorAttachment;

  MapBuilder<String, JsonObject?>? _clientExtensionResults;
  MapBuilder<String, JsonObject?> get clientExtensionResults =>
      _$this._clientExtensionResults ??= MapBuilder<String, JsonObject?>();
  set clientExtensionResults(MapBuilder<String, JsonObject?>? clientExtensionResults) =>
      _$this._clientExtensionResults = clientExtensionResults;

  PasskeyAssertionBuilder() {
    PasskeyAssertion._defaults(this);
  }

  PasskeyAssertionBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _rawId = $v.rawId;
      _type = $v.type;
      _response = $v.response.toBuilder();
      _authenticatorAttachment = $v.authenticatorAttachment;
      _clientExtensionResults = $v.clientExtensionResults.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PasskeyAssertion other) {
    _$v = other as _$PasskeyAssertion;
  }

  @override
  void update(void Function(PasskeyAssertionBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PasskeyAssertion build() => _build();

  _$PasskeyAssertion _build() {
    _$PasskeyAssertion _$result;
    try {
      _$result =
          _$v ??
          _$PasskeyAssertion._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'PasskeyAssertion', 'id'),
            rawId: BuiltValueNullFieldError.checkNotNull(rawId, r'PasskeyAssertion', 'rawId'),
            type: BuiltValueNullFieldError.checkNotNull(type, r'PasskeyAssertion', 'type'),
            response: response.build(),
            authenticatorAttachment: authenticatorAttachment,
            clientExtensionResults: clientExtensionResults.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'response';
        response.build();

        _$failedField = 'clientExtensionResults';
        clientExtensionResults.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'PasskeyAssertion', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
