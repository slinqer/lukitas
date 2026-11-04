//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'capture_result_category.g.dart';

/// CaptureResultCategory
///
/// Properties:
/// * [name]
/// * [fallback]
@BuiltValue()
abstract class CaptureResultCategory
    implements Built<CaptureResultCategory, CaptureResultCategoryBuilder> {
  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'fallback')
  bool get fallback;

  CaptureResultCategory._();

  factory CaptureResultCategory([void updates(CaptureResultCategoryBuilder b)]) =
      _$CaptureResultCategory;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CaptureResultCategoryBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CaptureResultCategory> get serializer => _$CaptureResultCategorySerializer();
}

class _$CaptureResultCategorySerializer implements PrimitiveSerializer<CaptureResultCategory> {
  @override
  final Iterable<Type> types = const [CaptureResultCategory, _$CaptureResultCategory];

  @override
  final String wireName = r'CaptureResultCategory';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CaptureResultCategory object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'name';
    yield serializers.serialize(object.name, specifiedType: const FullType(String));
    yield r'fallback';
    yield serializers.serialize(object.fallback, specifiedType: const FullType(bool));
  }

  @override
  Object serialize(
    Serializers serializers,
    CaptureResultCategory object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CaptureResultCategoryBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'name':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.name = valueDes;
          break;
        case r'fallback':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(bool)) as bool;
          result.fallback = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CaptureResultCategory deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CaptureResultCategoryBuilder();
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
