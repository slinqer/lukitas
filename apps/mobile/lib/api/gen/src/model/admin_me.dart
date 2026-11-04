//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_me.g.dart';

/// AdminMe
///
/// Properties:
/// * [id]
/// * [verifiedUntil]
@BuiltValue()
abstract class AdminMe implements Built<AdminMe, AdminMeBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'verifiedUntil')
  String get verifiedUntil;

  AdminMe._();

  factory AdminMe([void updates(AdminMeBuilder b)]) = _$AdminMe;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminMeBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminMe> get serializer => _$AdminMeSerializer();
}

class _$AdminMeSerializer implements PrimitiveSerializer<AdminMe> {
  @override
  final Iterable<Type> types = const [AdminMe, _$AdminMe];

  @override
  final String wireName = r'AdminMe';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminMe object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(object.id, specifiedType: const FullType(String));
    yield r'verifiedUntil';
    yield serializers.serialize(object.verifiedUntil, specifiedType: const FullType(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminMe object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminMeBuilder result,
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
        case r'verifiedUntil':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.verifiedUntil = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminMe deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminMeBuilder();
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
