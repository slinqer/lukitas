//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:wambito/api/gen/src/model/admin_user_assistants_inner.dart';
import 'package:wambito/api/gen/src/model/admin_user_passkeys_inner.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_user.g.dart';

/// AdminUser
///
/// Properties:
/// * [id]
/// * [email]
/// * [isAnonymous]
/// * [locale]
/// * [createdAt]
/// * [lastActiveAt]
/// * [suspendedAt]
/// * [sessionCount]
/// * [passkeys]
/// * [assistants]
@BuiltValue()
abstract class AdminUser implements Built<AdminUser, AdminUserBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'email')
  String? get email;

  @BuiltValueField(wireName: r'isAnonymous')
  bool get isAnonymous;

  @BuiltValueField(wireName: r'locale')
  String get locale;

  @BuiltValueField(wireName: r'createdAt')
  String get createdAt;

  @BuiltValueField(wireName: r'lastActiveAt')
  String? get lastActiveAt;

  @BuiltValueField(wireName: r'suspendedAt')
  String? get suspendedAt;

  @BuiltValueField(wireName: r'sessionCount')
  int get sessionCount;

  @BuiltValueField(wireName: r'passkeys')
  BuiltList<AdminUserPasskeysInner> get passkeys;

  @BuiltValueField(wireName: r'assistants')
  BuiltList<AdminUserAssistantsInner> get assistants;

  AdminUser._();

  factory AdminUser([void updates(AdminUserBuilder b)]) = _$AdminUser;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminUserBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminUser> get serializer => _$AdminUserSerializer();
}

class _$AdminUserSerializer implements PrimitiveSerializer<AdminUser> {
  @override
  final Iterable<Type> types = const [AdminUser, _$AdminUser];

  @override
  final String wireName = r'AdminUser';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminUser object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(object.id, specifiedType: const FullType(String));
    yield r'email';
    yield object.email == null
        ? null
        : serializers.serialize(object.email, specifiedType: const FullType.nullable(String));
    yield r'isAnonymous';
    yield serializers.serialize(object.isAnonymous, specifiedType: const FullType(bool));
    yield r'locale';
    yield serializers.serialize(object.locale, specifiedType: const FullType(String));
    yield r'createdAt';
    yield serializers.serialize(object.createdAt, specifiedType: const FullType(String));
    yield r'lastActiveAt';
    yield object.lastActiveAt == null
        ? null
        : serializers.serialize(
            object.lastActiveAt,
            specifiedType: const FullType.nullable(String),
          );
    yield r'suspendedAt';
    yield object.suspendedAt == null
        ? null
        : serializers.serialize(object.suspendedAt, specifiedType: const FullType.nullable(String));
    yield r'sessionCount';
    yield serializers.serialize(object.sessionCount, specifiedType: const FullType(int));
    yield r'passkeys';
    yield serializers.serialize(
      object.passkeys,
      specifiedType: const FullType(BuiltList, [FullType(AdminUserPasskeysInner)]),
    );
    yield r'assistants';
    yield serializers.serialize(
      object.assistants,
      specifiedType: const FullType(BuiltList, [FullType(AdminUserAssistantsInner)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminUser object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminUserBuilder result,
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
        case r'email':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.email = valueDes;
          break;
        case r'isAnonymous':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(bool)) as bool;
          result.isAnonymous = valueDes;
          break;
        case r'locale':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.locale = valueDes;
          break;
        case r'createdAt':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.createdAt = valueDes;
          break;
        case r'lastActiveAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.lastActiveAt = valueDes;
          break;
        case r'suspendedAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.suspendedAt = valueDes;
          break;
        case r'sessionCount':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(int)) as int;
          result.sessionCount = valueDes;
          break;
        case r'passkeys':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(AdminUserPasskeysInner)]),
          ) as BuiltList<AdminUserPasskeysInner>;
          result.passkeys.replace(valueDes);
          break;
        case r'assistants':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(AdminUserAssistantsInner)]),
          ) as BuiltList<AdminUserAssistantsInner>;
          result.assistants.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminUser deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminUserBuilder();
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
