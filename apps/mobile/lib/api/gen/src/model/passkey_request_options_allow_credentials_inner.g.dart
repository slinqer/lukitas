// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'passkey_request_options_allow_credentials_inner.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const PasskeyRequestOptionsAllowCredentialsInnerTypeEnum
_$passkeyRequestOptionsAllowCredentialsInnerTypeEnum_publicKey =
    const PasskeyRequestOptionsAllowCredentialsInnerTypeEnum._('publicKey');

PasskeyRequestOptionsAllowCredentialsInnerTypeEnum
_$passkeyRequestOptionsAllowCredentialsInnerTypeEnumValueOf(String name) {
  switch (name) {
    case 'publicKey':
      return _$passkeyRequestOptionsAllowCredentialsInnerTypeEnum_publicKey;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<PasskeyRequestOptionsAllowCredentialsInnerTypeEnum>
_$passkeyRequestOptionsAllowCredentialsInnerTypeEnumValues =
    BuiltSet<PasskeyRequestOptionsAllowCredentialsInnerTypeEnum>(
      const <PasskeyRequestOptionsAllowCredentialsInnerTypeEnum>[
        _$passkeyRequestOptionsAllowCredentialsInnerTypeEnum_publicKey,
      ],
    );

Serializer<PasskeyRequestOptionsAllowCredentialsInnerTypeEnum>
_$passkeyRequestOptionsAllowCredentialsInnerTypeEnumSerializer =
    _$PasskeyRequestOptionsAllowCredentialsInnerTypeEnumSerializer();

class _$PasskeyRequestOptionsAllowCredentialsInnerTypeEnumSerializer
    implements PrimitiveSerializer<PasskeyRequestOptionsAllowCredentialsInnerTypeEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{'publicKey': 'public-key'};
  static const Map<Object, String> _fromWire = const <Object, String>{'public-key': 'publicKey'};

  @override
  final Iterable<Type> types = const <Type>[PasskeyRequestOptionsAllowCredentialsInnerTypeEnum];
  @override
  final String wireName = 'PasskeyRequestOptionsAllowCredentialsInnerTypeEnum';

  @override
  Object serialize(
    Serializers serializers,
    PasskeyRequestOptionsAllowCredentialsInnerTypeEnum object, {
    FullType specifiedType = FullType.unspecified,
  }) => _toWire[object.name] ?? object.name;

  @override
  PasskeyRequestOptionsAllowCredentialsInnerTypeEnum deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) => PasskeyRequestOptionsAllowCredentialsInnerTypeEnum.valueOf(
    _fromWire[serialized] ?? (serialized is String ? serialized : ''),
  );
}

class _$PasskeyRequestOptionsAllowCredentialsInner
    extends PasskeyRequestOptionsAllowCredentialsInner {
  @override
  final String id;
  @override
  final PasskeyRequestOptionsAllowCredentialsInnerTypeEnum type;
  @override
  final BuiltList<String>? transports;

  factory _$PasskeyRequestOptionsAllowCredentialsInner([
    void Function(PasskeyRequestOptionsAllowCredentialsInnerBuilder)? updates,
  ]) => (PasskeyRequestOptionsAllowCredentialsInnerBuilder()..update(updates))._build();

  _$PasskeyRequestOptionsAllowCredentialsInner._({
    required this.id,
    required this.type,
    this.transports,
  }) : super._();
  @override
  PasskeyRequestOptionsAllowCredentialsInner rebuild(
    void Function(PasskeyRequestOptionsAllowCredentialsInnerBuilder) updates,
  ) => (toBuilder()..update(updates)).build();

  @override
  PasskeyRequestOptionsAllowCredentialsInnerBuilder toBuilder() =>
      PasskeyRequestOptionsAllowCredentialsInnerBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PasskeyRequestOptionsAllowCredentialsInner &&
        id == other.id &&
        type == other.type &&
        transports == other.transports;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, type.hashCode);
    _$hash = $jc(_$hash, transports.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PasskeyRequestOptionsAllowCredentialsInner')
          ..add('id', id)
          ..add('type', type)
          ..add('transports', transports))
        .toString();
  }
}

class PasskeyRequestOptionsAllowCredentialsInnerBuilder
    implements
        Builder<
          PasskeyRequestOptionsAllowCredentialsInner,
          PasskeyRequestOptionsAllowCredentialsInnerBuilder
        > {
  _$PasskeyRequestOptionsAllowCredentialsInner? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  PasskeyRequestOptionsAllowCredentialsInnerTypeEnum? _type;
  PasskeyRequestOptionsAllowCredentialsInnerTypeEnum? get type => _$this._type;
  set type(PasskeyRequestOptionsAllowCredentialsInnerTypeEnum? type) => _$this._type = type;

  ListBuilder<String>? _transports;
  ListBuilder<String> get transports => _$this._transports ??= ListBuilder<String>();
  set transports(ListBuilder<String>? transports) => _$this._transports = transports;

  PasskeyRequestOptionsAllowCredentialsInnerBuilder() {
    PasskeyRequestOptionsAllowCredentialsInner._defaults(this);
  }

  PasskeyRequestOptionsAllowCredentialsInnerBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _type = $v.type;
      _transports = $v.transports?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PasskeyRequestOptionsAllowCredentialsInner other) {
    _$v = other as _$PasskeyRequestOptionsAllowCredentialsInner;
  }

  @override
  void update(void Function(PasskeyRequestOptionsAllowCredentialsInnerBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PasskeyRequestOptionsAllowCredentialsInner build() => _build();

  _$PasskeyRequestOptionsAllowCredentialsInner _build() {
    _$PasskeyRequestOptionsAllowCredentialsInner _$result;
    try {
      _$result =
          _$v ??
          _$PasskeyRequestOptionsAllowCredentialsInner._(
            id: BuiltValueNullFieldError.checkNotNull(
              id,
              r'PasskeyRequestOptionsAllowCredentialsInner',
              'id',
            ),
            type: BuiltValueNullFieldError.checkNotNull(
              type,
              r'PasskeyRequestOptionsAllowCredentialsInner',
              'type',
            ),
            transports: _transports?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'transports';
        _transports?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
          r'PasskeyRequestOptionsAllowCredentialsInner',
          _$failedField,
          e.toString(),
        );
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
