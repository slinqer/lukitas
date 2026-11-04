//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_audit_entry.g.dart';

/// AdminAuditEntry
///
/// Properties:
/// * [id]
/// * [at]
/// * [adminUserId]
/// * [action]
/// * [targetUserId]
/// * [emailHash]
/// * [reason]
/// * [detail]
@BuiltValue()
abstract class AdminAuditEntry implements Built<AdminAuditEntry, AdminAuditEntryBuilder> {
  @BuiltValueField(wireName: r'id')
  String get id;

  @BuiltValueField(wireName: r'at')
  String get at;

  @BuiltValueField(wireName: r'adminUserId')
  String? get adminUserId;

  @BuiltValueField(wireName: r'action')
  String get action;

  @BuiltValueField(wireName: r'targetUserId')
  String? get targetUserId;

  @BuiltValueField(wireName: r'emailHash')
  String? get emailHash;

  @BuiltValueField(wireName: r'reason')
  String? get reason;

  @BuiltValueField(wireName: r'detail')
  BuiltMap<String, String>? get detail;

  AdminAuditEntry._();

  factory AdminAuditEntry([void updates(AdminAuditEntryBuilder b)]) = _$AdminAuditEntry;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAuditEntryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAuditEntry> get serializer => _$AdminAuditEntrySerializer();
}

class _$AdminAuditEntrySerializer implements PrimitiveSerializer<AdminAuditEntry> {
  @override
  final Iterable<Type> types = const [AdminAuditEntry, _$AdminAuditEntry];

  @override
  final String wireName = r'AdminAuditEntry';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAuditEntry object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'id';
    yield serializers.serialize(object.id, specifiedType: const FullType(String));
    yield r'at';
    yield serializers.serialize(object.at, specifiedType: const FullType(String));
    yield r'adminUserId';
    yield object.adminUserId == null
        ? null
        : serializers.serialize(object.adminUserId, specifiedType: const FullType.nullable(String));
    yield r'action';
    yield serializers.serialize(object.action, specifiedType: const FullType(String));
    yield r'targetUserId';
    yield object.targetUserId == null
        ? null
        : serializers.serialize(
            object.targetUserId,
            specifiedType: const FullType.nullable(String),
          );
    yield r'emailHash';
    yield object.emailHash == null
        ? null
        : serializers.serialize(object.emailHash, specifiedType: const FullType.nullable(String));
    yield r'reason';
    yield object.reason == null
        ? null
        : serializers.serialize(object.reason, specifiedType: const FullType.nullable(String));
    yield r'detail';
    yield object.detail == null
        ? null
        : serializers.serialize(
            object.detail,
            specifiedType: const FullType.nullable(BuiltMap, [FullType(String), FullType(String)]),
          );
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAuditEntry object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAuditEntryBuilder result,
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
        case r'at':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.at = valueDes;
          break;
        case r'adminUserId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.adminUserId = valueDes;
          break;
        case r'action':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.action = valueDes;
          break;
        case r'targetUserId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.targetUserId = valueDes;
          break;
        case r'emailHash':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.emailHash = valueDes;
          break;
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.reason = valueDes;
          break;
        case r'detail':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(BuiltMap, [FullType(String), FullType(String)]),
          ) as BuiltMap<String, String>?;
          if (valueDes == null) continue;
          result.detail.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAuditEntry deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAuditEntryBuilder();
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
