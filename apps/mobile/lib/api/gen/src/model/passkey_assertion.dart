//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:wambito/api/gen/src/model/passkey_assertion_response.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'passkey_assertion.g.dart';

/// PasskeyAssertion
///
/// Properties:
/// * [id]
/// * [rawId]
/// * [type]
/// * [response]
/// * [authenticatorAttachment]
/// * [clientExtensionResults]
@BuiltValue()
abstract class PasskeyAssertion implements Built<PasskeyAssertion, PasskeyAssertionBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'rawId')
  String get rawId;

  @BuiltValueField(wireName: r'type')
  PasskeyAssertionTypeEnum get type;
  // enum typeEnum {  public-key,  };

  @BuiltValueField(wireName: r'response')
  PasskeyAssertionResponse get response;

  @BuiltValueField(wireName: r'authenticatorAttachment')
  PasskeyAssertionAuthenticatorAttachmentEnum? get authenticatorAttachment;
  // enum authenticatorAttachmentEnum {  platform,  cross-platform,  };

  @BuiltValueField(wireName: r'clientExtensionResults')
  BuiltMap<String, JsonObject?> get clientExtensionResults;

  PasskeyAssertion._();

  factory PasskeyAssertion([void updates(PasskeyAssertionBuilder b)]) = _$PasskeyAssertion;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PasskeyAssertionBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PasskeyAssertion> get serializer => _$PasskeyAssertionSerializer();
}

class _$PasskeyAssertionSerializer implements PrimitiveSerializer<PasskeyAssertion> {
  @override
  final Iterable<Type> types = const [PasskeyAssertion, _$PasskeyAssertion];

  @override
  final String wireName = r'PasskeyAssertion';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PasskeyAssertion object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(object.id, specifiedType: const FullType(String));
    yield r'rawId';
    yield serializers.serialize(object.rawId, specifiedType: const FullType(String));
    yield r'type';
    yield serializers.serialize(
      object.type,
      specifiedType: const FullType(PasskeyAssertionTypeEnum),
    );
    yield r'response';
    yield serializers.serialize(
      object.response,
      specifiedType: const FullType(PasskeyAssertionResponse),
    );
    if (object.authenticatorAttachment != null) {
      yield r'authenticatorAttachment';
      yield serializers.serialize(
        object.authenticatorAttachment,
        specifiedType: const FullType(PasskeyAssertionAuthenticatorAttachmentEnum),
      );
    }
    yield r'clientExtensionResults';
    yield serializers.serialize(
      object.clientExtensionResults,
      specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    PasskeyAssertion object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PasskeyAssertionBuilder result,
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
        case r'rawId':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.rawId = valueDes;
          break;
        case r'type':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PasskeyAssertionTypeEnum),
          ) as PasskeyAssertionTypeEnum;
          result.type = valueDes;
          break;
        case r'response':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(PasskeyAssertionResponse),
          ) as PasskeyAssertionResponse;
          result.response.replace(valueDes);
          break;
        case r'authenticatorAttachment':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(PasskeyAssertionAuthenticatorAttachmentEnum),
          ) as PasskeyAssertionAuthenticatorAttachmentEnum?;
          if (valueDes == null) continue;
          result.authenticatorAttachment = valueDes;
          break;
        case r'clientExtensionResults':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [
              FullType(String),
              FullType.nullable(JsonObject),
            ]),
          ) as BuiltMap<String, JsonObject?>;
          result.clientExtensionResults.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PasskeyAssertion deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PasskeyAssertionBuilder();
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

class PasskeyAssertionTypeEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'public-key')
  static const PasskeyAssertionTypeEnum publicKey = _$passkeyAssertionTypeEnum_publicKey;

  static Serializer<PasskeyAssertionTypeEnum> get serializer =>
      _$passkeyAssertionTypeEnumSerializer;

  const PasskeyAssertionTypeEnum._(String name) : super(name);

  static BuiltSet<PasskeyAssertionTypeEnum> get values => _$passkeyAssertionTypeEnumValues;
  static PasskeyAssertionTypeEnum valueOf(String name) => _$passkeyAssertionTypeEnumValueOf(name);
}

class PasskeyAssertionAuthenticatorAttachmentEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'platform')
  static const PasskeyAssertionAuthenticatorAttachmentEnum platform =
      _$passkeyAssertionAuthenticatorAttachmentEnum_platform;
  @BuiltValueEnumConst(wireName: r'cross-platform')
  static const PasskeyAssertionAuthenticatorAttachmentEnum crossPlatform =
      _$passkeyAssertionAuthenticatorAttachmentEnum_crossPlatform;

  static Serializer<PasskeyAssertionAuthenticatorAttachmentEnum> get serializer =>
      _$passkeyAssertionAuthenticatorAttachmentEnumSerializer;

  const PasskeyAssertionAuthenticatorAttachmentEnum._(String name) : super(name);

  static BuiltSet<PasskeyAssertionAuthenticatorAttachmentEnum> get values =>
      _$passkeyAssertionAuthenticatorAttachmentEnumValues;
  static PasskeyAssertionAuthenticatorAttachmentEnum valueOf(String name) =>
      _$passkeyAssertionAuthenticatorAttachmentEnumValueOf(name);
}
