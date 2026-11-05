//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:wambito/api/gen/src/model/capture_result_transaction.dart';
import 'package:wambito/api/gen/src/model/capture_result_category.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'capture_result.g.dart';

/// CaptureResult
///
/// Properties:
/// * [result]
/// * [transaction]
/// * [category]
@BuiltValue()
abstract class CaptureResult implements Built<CaptureResult, CaptureResultBuilder> {
  @BuiltValueField(wireName: r'result')
  CaptureResultResultEnum get result;
  // enum resultEnum {  created,  merged,  };

  @BuiltValueField(wireName: r'transaction')
  CaptureResultTransaction get transaction;

  @BuiltValueField(wireName: r'category')
  CaptureResultCategory get category;

  CaptureResult._();

  factory CaptureResult([void updates(CaptureResultBuilder b)]) = _$CaptureResult;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CaptureResultBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CaptureResult> get serializer => _$CaptureResultSerializer();
}

class _$CaptureResultSerializer implements PrimitiveSerializer<CaptureResult> {
  @override
  final Iterable<Type> types = const [CaptureResult, _$CaptureResult];

  @override
  final String wireName = r'CaptureResult';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CaptureResult object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'result';
    yield serializers.serialize(
      object.result,
      specifiedType: const FullType(CaptureResultResultEnum),
    );
    yield r'transaction';
    yield serializers.serialize(
      object.transaction,
      specifiedType: const FullType(CaptureResultTransaction),
    );
    yield r'category';
    yield serializers.serialize(
      object.category,
      specifiedType: const FullType(CaptureResultCategory),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    CaptureResult object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required CaptureResultBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'result':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CaptureResultResultEnum),
          ) as CaptureResultResultEnum;
          result.result = valueDes;
          break;
        case r'transaction':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CaptureResultTransaction),
          ) as CaptureResultTransaction;
          result.transaction.replace(valueDes);
          break;
        case r'category':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(CaptureResultCategory),
          ) as CaptureResultCategory;
          result.category.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  CaptureResult deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CaptureResultBuilder();
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

class CaptureResultResultEnum extends EnumClass {
  @BuiltValueEnumConst(wireName: r'created')
  static const CaptureResultResultEnum created = _$captureResultResultEnum_created;
  @BuiltValueEnumConst(wireName: r'merged')
  static const CaptureResultResultEnum merged = _$captureResultResultEnum_merged;

  static Serializer<CaptureResultResultEnum> get serializer => _$captureResultResultEnumSerializer;

  const CaptureResultResultEnum._(String name) : super(name);

  static BuiltSet<CaptureResultResultEnum> get values => _$captureResultResultEnumValues;
  static CaptureResultResultEnum valueOf(String name) => _$captureResultResultEnumValueOf(name);
}
