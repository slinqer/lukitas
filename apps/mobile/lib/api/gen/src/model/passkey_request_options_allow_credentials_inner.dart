//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'passkey_request_options_allow_credentials_inner.g.dart';

/// PasskeyRequestOptionsAllowCredentialsInner
///
/// Properties:
/// * [id]
/// * [type]
/// * [transports]
@BuiltValue()
abstract class PasskeyRequestOptionsAllowCredentialsInner
    implements
        Built<
          PasskeyRequestOptionsAllowCredentialsInner,
          PasskeyRequestOptionsAllowCredentialsInnerBuilder
        > {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'type')
  PasskeyRequestOptionsAllowCredentialsInnerTypeEnum get type;
  // enum typeEnum {  public-key,  };

  @BuiltValueField(wireName: r'transports')
  BuiltList<String>? get transports;

  PasskeyRequestOptionsAllowCredentialsInner._();

  factory PasskeyRequestOptionsAllowCredentialsInner([
    void updates(PasskeyRequestOptionsAllowCredentialsInnerBuilder b),
  ]) = _$PasskeyRequestOptionsAllowCredentialsInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PasskeyRequestOptionsAllowCredentialsInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PasskeyRequestOptionsAllowCredentialsInner> get serializer =>
      _$PasskeyRequestOptionsAllowCredentialsInnerSerializer();
}

class _$PasskeyRequestOptionsAllowCredentialsInnerSerializer
    implements PrimitiveSerializer<PasskeyRequestOptionsAllowCredentialsInner> {
  @override
  final Iterable<Type> types = const [
    PasskeyRequestOptionsAllowCredentialsInner,
    _$PasskeyRequestOptionsAllowCredentialsInner,
  ];

  @override
  final String wireName = r'PasskeyRequestOptionsAllowCredentialsInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PasskeyRequestOptionsAllowCredentialsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(object.id, specifiedType: const FullType(String));
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(PasskeyRequestOptionsAllowCredentialsInnerTypeEnum),
    );
    if (object.transports != null) {
      yield r'transports';
      yield serializers.serialize(
        object.transports,
        specifiedType: const FullType(BuiltList, [FullType(String)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PasskeyRequestOptionsAllowCredentialsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PasskeyRequestOptionsAllowCredentialsInnerBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'id':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.id = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PasskeyRequestOptionsAllowCredentialsInnerTypeEnum),
          ) as PasskeyRequestOptionsAllowCredentialsInnerTypeEnum;
          result.type = valueDes;
          break;
        case r'transports':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(BuiltList, [FullType(String)]),
          ) as BuiltList<String>?;
          if (valueDes == null) continue;
          result.transports.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PasskeyRequestOptionsAllowCredentialsInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PasskeyRequestOptionsAllowCredentialsInnerBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}

class PasskeyRequestOptionsAllowCredentialsInnerTypeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'public-key')
  static const PasskeyRequestOptionsAllowCredentialsInnerTypeEnum publicKey =
      _$passkeyRequestOptionsAllowCredentialsInnerTypeEnum_publicKey;

  static Serializer<PasskeyRequestOptionsAllowCredentialsInnerTypeEnum> get serializer =>
      _$passkeyRequestOptionsAllowCredentialsInnerTypeEnumSerializer;

  const PasskeyRequestOptionsAllowCredentialsInnerTypeEnum._(String name) : super(name);

  static BuiltSet<PasskeyRequestOptionsAllowCredentialsInnerTypeEnum> get values =>
      _$passkeyRequestOptionsAllowCredentialsInnerTypeEnumValues;
  static PasskeyRequestOptionsAllowCredentialsInnerTypeEnum valueOf(String name) =>
      _$passkeyRequestOptionsAllowCredentialsInnerTypeEnumValueOf(name);
}
