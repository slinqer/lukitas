//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_user_assistants_inner.g.dart';

/// AdminUserAssistantsInner
///
/// Properties:
/// * [clientId]
/// * [name]
/// * [consentedAt]
@BuiltValue()
abstract class AdminUserAssistantsInner
    implements Built<AdminUserAssistantsInner, AdminUserAssistantsInnerBuilder> {
  @BuiltValueField(wireName: r'clientId')
  String get clientId;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'consentedAt')
  String get consentedAt;

  AdminUserAssistantsInner._();

  factory AdminUserAssistantsInner([void updates(AdminUserAssistantsInnerBuilder b)]) =
      _$AdminUserAssistantsInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminUserAssistantsInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminUserAssistantsInner> get serializer =>
      _$AdminUserAssistantsInnerSerializer();
}

class _$AdminUserAssistantsInnerSerializer
    implements PrimitiveSerializer<AdminUserAssistantsInner> {
  @override
  final Iterable<Type> types = const [AdminUserAssistantsInner, _$AdminUserAssistantsInner];

  @override
  final String wireName = r'AdminUserAssistantsInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminUserAssistantsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'clientId';
    yield serializers.serialize(object.clientId, specifiedType: const FullType(String));
    yield r'name';
    yield serializers.serialize(object.name, specifiedType: const FullType(String));
    yield r'consentedAt';
    yield serializers.serialize(object.consentedAt, specifiedType: const FullType(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminUserAssistantsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminUserAssistantsInnerBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'clientId':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.clientId = valueDes;
          break;
        case r'name':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.name = valueDes;
          break;
        case r'consentedAt':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.consentedAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminUserAssistantsInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminUserAssistantsInnerBuilder();
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
