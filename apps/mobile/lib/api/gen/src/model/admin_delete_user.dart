//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_delete_user.g.dart';

/// AdminDeleteUser
///
/// Properties:
/// * [reason]
/// * [confirm]
@BuiltValue()
abstract class AdminDeleteUser implements Built<AdminDeleteUser, AdminDeleteUserBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  @BuiltValueField(wireName: r'confirm')
  String get confirm;

  AdminDeleteUser._();

  factory AdminDeleteUser([void updates(AdminDeleteUserBuilder b)]) = _$AdminDeleteUser;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminDeleteUserBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminDeleteUser> get serializer => _$AdminDeleteUserSerializer();
}

class _$AdminDeleteUserSerializer implements PrimitiveSerializer<AdminDeleteUser> {
  @override
  final Iterable<Type> types = const [AdminDeleteUser, _$AdminDeleteUser];

  @override
  final String wireName = r'AdminDeleteUser';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminDeleteUser object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(object.reason, specifiedType: const FullType(String));
    yield r'confirm';
    yield serializers.serialize(object.confirm, specifiedType: const FullType(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminDeleteUser object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminDeleteUserBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reason':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.reason = valueDes;
          break;
        case r'confirm':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.confirm = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminDeleteUser deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminDeleteUserBuilder();
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
