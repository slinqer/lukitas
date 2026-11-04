//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'admin_metrics_weekly_inner.g.dart';

/// AdminMetricsWeeklyInner
///
/// Properties:
/// * [weekStart]
/// * [withEmail]
/// * [guests]
@BuiltValue()
abstract class AdminMetricsWeeklyInner
    implements Built<AdminMetricsWeeklyInner, AdminMetricsWeeklyInnerBuilder> {
  @BuiltValueField(wireName: r'weekStart')
  String get weekStart;

  @BuiltValueField(wireName: r'withEmail')
  int get withEmail;

  @BuiltValueField(wireName: r'guests')
  int get guests;

  AdminMetricsWeeklyInner._();

  factory AdminMetricsWeeklyInner([void updates(AdminMetricsWeeklyInnerBuilder b)]) =
      _$AdminMetricsWeeklyInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(AdminMetricsWeeklyInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<AdminMetricsWeeklyInner> get serializer =>
      _$AdminMetricsWeeklyInnerSerializer();
}

class _$AdminMetricsWeeklyInnerSerializer implements PrimitiveSerializer<AdminMetricsWeeklyInner> {
  @override
  final Iterable<Type> types = const [AdminMetricsWeeklyInner, _$AdminMetricsWeeklyInner];

  @override
  final String wireName = r'AdminMetricsWeeklyInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    AdminMetricsWeeklyInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'weekStart';
    yield serializers.serialize(object.weekStart, specifiedType: const FullType(String));
    yield r'withEmail';
    yield serializers.serialize(object.withEmail, specifiedType: const FullType(int));
    yield r'guests';
    yield serializers.serialize(object.guests, specifiedType: const FullType(int));
  }

  @override
  Object serialize(
    Serializers serializers,
    AdminMetricsWeeklyInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required AdminMetricsWeeklyInnerBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'weekStart':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.weekStart = valueDes;
          break;
        case r'withEmail':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(int)) as int;
          result.withEmail = valueDes;
          break;
        case r'guests':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(int)) as int;
          result.guests = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  AdminMetricsWeeklyInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = AdminMetricsWeeklyInnerBuilder();
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
