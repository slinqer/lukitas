//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_action_reason.g.dart';

/// AdminActionReason
///
/// Properties:
/// * [reason]
@BuiltValue()
abstract class AdminActionReason implements Built<AdminActionReason, AdminActionReasonBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  AdminActionReason._();

  factory AdminActionReason([void updates(AdminActionReasonBuilder b)]) = _$AdminActionReason;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminActionReasonBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminActionReason> get serializer => _$AdminActionReasonSerializer();
}

class _$AdminActionReasonSerializer implements PrimitiveSerializer<AdminActionReason> {
  @override
  final Iterable<Type> types = const [AdminActionReason, _$AdminActionReason];

  @override
  final String wireName = r'AdminActionReason';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminActionReason object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(object.reason, specifiedType: const FullType(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminActionReason object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminActionReasonBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminActionReason deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminActionReasonBuilder();
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
