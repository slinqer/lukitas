//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'passkey_assertion_response.g.dart';

/// PasskeyAssertionResponse
///
/// Properties:
/// * [clientDataJSON]
/// * [authenticatorData]
/// * [signature]
/// * [userHandle]
@BuiltValue()
abstract class PasskeyAssertionResponse
    implements Built<PasskeyAssertionResponse, PasskeyAssertionResponseBuilder> {
  @BuiltValueField(wireName: r'clientDataJSON')
  String get clientDataJSON;

  @BuiltValueField(wireName: r'authenticatorData')
  String get authenticatorData;

  @BuiltValueField(wireName: r'signature')
  String get signature;

  @BuiltValueField(wireName: r'userHandle')
  String? get userHandle;

  PasskeyAssertionResponse._();

  factory PasskeyAssertionResponse([void updates(PasskeyAssertionResponseBuilder b)]) =
      _$PasskeyAssertionResponse;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PasskeyAssertionResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PasskeyAssertionResponse> get serializer =>
      _$PasskeyAssertionResponseSerializer();
}

class _$PasskeyAssertionResponseSerializer
    implements PrimitiveSerializer<PasskeyAssertionResponse> {
  @override
  final Iterable<Type> types = const [PasskeyAssertionResponse, _$PasskeyAssertionResponse];

  @override
  final String wireName = r'PasskeyAssertionResponse';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PasskeyAssertionResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'clientDataJSON';
    yield serializers.serialize(object.clientDataJSON, specifiedType: const FullType(String));
    yield r'authenticatorData';
    yield serializers.serialize(object.authenticatorData, specifiedType: const FullType(String));
    yield r'signature';
    yield serializers.serialize(object.signature, specifiedType: const FullType(String));
    if (object.userHandle != null) {
      yield r'userHandle';
      yield serializers.serialize(object.userHandle, specifiedType: const FullType(String));
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PasskeyAssertionResponse object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PasskeyAssertionResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'clientDataJSON':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.clientDataJSON = valueDes;
          break;
        case r'authenticatorData':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.authenticatorData = valueDes;
          break;
        case r'signature':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.signature = valueDes;
          break;
        case r'userHandle':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.userHandle = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PasskeyAssertionResponse deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PasskeyAssertionResponseBuilder();
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
