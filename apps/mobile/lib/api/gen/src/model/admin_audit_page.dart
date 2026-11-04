//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:wambito/api/gen/src/model/admin_audit_entry.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_audit_page.g.dart';

/// AdminAuditPage
///
/// Properties:
/// * [entries]
/// * [next]
@BuiltValue()
abstract class AdminAuditPage implements Built<AdminAuditPage, AdminAuditPageBuilder> {
  @BuiltValueField(wireName: r'entries')
  BuiltList<AdminAuditEntry> get entries;

  @BuiltValueField(wireName: r'next')
  String? get next;

  AdminAuditPage._();

  factory AdminAuditPage([void updates(AdminAuditPageBuilder b)]) = _$AdminAuditPage;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminAuditPageBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminAuditPage> get serializer => _$AdminAuditPageSerializer();
}

class _$AdminAuditPageSerializer implements PrimitiveSerializer<AdminAuditPage> {
  @override
  final Iterable<Type> types = const [AdminAuditPage, _$AdminAuditPage];

  @override
  final String wireName = r'AdminAuditPage';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminAuditPage object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'entries';
    yield serializers.serialize(
      object.entries,
      specifiedType: const FullType(BuiltList, [FullType(AdminAuditEntry)]),
    );
    yield r'next';
    yield object.next == null
        ? null
        : serializers.serialize(object.next, specifiedType: const FullType.nullable(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminAuditPage object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminAuditPageBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'entries':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(AdminAuditEntry)]),
          ) as BuiltList<AdminAuditEntry>;
          result.entries.replace(valueDes);
          break;
        case r'next':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(String),
          ) as String?;
          if (valueDes == null) continue;
          result.next = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminAuditPage deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminAuditPageBuilder();
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
