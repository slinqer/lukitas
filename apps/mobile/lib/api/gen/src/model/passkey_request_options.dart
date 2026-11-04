//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:wambito/api/gen/src/model/passkey_request_options_allow_credentials_inner.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'passkey_request_options.g.dart';

/// PasskeyRequestOptions
///
/// Properties:
/// * [challenge]
/// * [timeout]
/// * [rpId]
/// * [allowCredentials]
/// * [userVerification]
/// * [extensions]
@BuiltValue()
abstract class PasskeyRequestOptions
    implements Built<PasskeyRequestOptions, PasskeyRequestOptionsBuilder> {
  @BuiltValueField(wireName: r'challenge')
  String get challenge;

  @BuiltValueField(wireName: r'timeout')
  num? get timeout;

  @BuiltValueField(wireName: r'rpId')
  String? get rpId;

  @BuiltValueField(wireName: r'allowCredentials')
  BuiltList<PasskeyRequestOptionsAllowCredentialsInner>? get allowCredentials;

  @BuiltValueField(wireName: r'userVerification')
  String? get userVerification;

  @BuiltValueField(wireName: r'extensions')
  BuiltMap<String, JsonObject?>? get extensions;

  PasskeyRequestOptions._();

  factory PasskeyRequestOptions([void updates(PasskeyRequestOptionsBuilder b)]) =
      _$PasskeyRequestOptions;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(PasskeyRequestOptionsBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<PasskeyRequestOptions> get serializer => _$PasskeyRequestOptionsSerializer();
}

class _$PasskeyRequestOptionsSerializer implements PrimitiveSerializer<PasskeyRequestOptions> {
  @override
  final Iterable<Type> types = const [PasskeyRequestOptions, _$PasskeyRequestOptions];

  @override
  final String wireName = r'PasskeyRequestOptions';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    PasskeyRequestOptions object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'challenge';
    yield serializers.serialize(object.challenge, specifiedType: const FullType(String));
    if (object.timeout != null) {
      yield r'timeout';
      yield serializers.serialize(object.timeout, specifiedType: const FullType(num));
    }
    if (object.rpId != null) {
      yield r'rpId';
      yield serializers.serialize(object.rpId, specifiedType: const FullType(String));
    }
    if (object.allowCredentials != null) {
      yield r'allowCredentials';
      yield serializers.serialize(
        object.allowCredentials,
        specifiedType: const FullType(BuiltList, [
          FullType(PasskeyRequestOptionsAllowCredentialsInner),
        ]),
      );
    }
    if (object.userVerification != null) {
      yield r'userVerification';
      yield serializers.serialize(object.userVerification, specifiedType: const FullType(String));
    }
    if (object.extensions != null) {
      yield r'extensions';
      yield serializers.serialize(
        object.extensions,
        specifiedType: const FullType(BuiltMap, [FullType(String), FullType.nullable(JsonObject)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    PasskeyRequestOptions object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required PasskeyRequestOptionsBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'challenge':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.challenge = valueDes;
          break;
        case r'timeout':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType.nullable(num)) as num?;
          if (valueDes == null) continue;
          result.timeout = valueDes;
          break;
        case r'rpId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.rpId = valueDes;
          break;
        case r'allowCredentials':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(BuiltList, [
              FullType(PasskeyRequestOptionsAllowCredentialsInner),
            ]),
          ) as BuiltList<PasskeyRequestOptionsAllowCredentialsInner>?;
          if (valueDes == null) continue;
          result.allowCredentials.replace(valueDes);
          break;
        case r'userVerification':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.userVerification = valueDes;
          break;
        case r'extensions':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(BuiltMap, [
              FullType(String),
              FullType.nullable(JsonObject),
            ]),
          ) as BuiltMap<String, JsonObject?>?;
          if (valueDes == null) continue;
          result.extensions.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  PasskeyRequestOptions deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = PasskeyRequestOptionsBuilder();
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
