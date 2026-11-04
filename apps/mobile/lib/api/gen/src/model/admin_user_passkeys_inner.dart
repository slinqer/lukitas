//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_user_passkeys_inner.g.dart';

/// AdminUserPasskeysInner
///
/// Properties:
/// * [id]
/// * [name]
/// * [deviceType]
/// * [createdAt]
@BuiltValue()
abstract class AdminUserPasskeysInner
    implements Built<AdminUserPasskeysInner, AdminUserPasskeysInnerBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'name')
  String? get name;

  @BuiltValueField(wireName: r'deviceType')
  String get deviceType;

  @BuiltValueField(wireName: r'createdAt')
  String? get createdAt;

  AdminUserPasskeysInner._();

  factory AdminUserPasskeysInner([void updates(AdminUserPasskeysInnerBuilder b)]) =
      _$AdminUserPasskeysInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminUserPasskeysInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminUserPasskeysInner> get serializer => _$AdminUserPasskeysInnerSerializer();
}

class _$AdminUserPasskeysInnerSerializer implements PrimitiveSerializer<AdminUserPasskeysInner> {
  @override
  final Iterable<Type> types = const [AdminUserPasskeysInner, _$AdminUserPasskeysInner];

  @override
  final String wireName = r'AdminUserPasskeysInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminUserPasskeysInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(object.id, specifiedType: const FullType(String));
    yield r'name';
    yield object.name == null
        ? null
        : serializers.serialize(object.name, specifiedType: const FullType.nullable(String));
    yield r'deviceType';
    yield serializers.serialize(object.deviceType, specifiedType: const FullType(String));
    yield r'createdAt';
    yield object.createdAt == null
        ? null
        : serializers.serialize(object.createdAt, specifiedType: const FullType.nullable(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminUserPasskeysInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminUserPasskeysInnerBuilder result,
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
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.name = valueDes;
          break;
        case r'deviceType':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.deviceType = valueDes;
          break;
        case r'createdAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.createdAt = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminUserPasskeysInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminUserPasskeysInnerBuilder();
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
