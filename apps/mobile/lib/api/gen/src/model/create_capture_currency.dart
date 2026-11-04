//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'dart:core';

import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';
import 'package:one_of/any_of.dart';

part 'create_capture_currency.g.dart';

/// CreateCaptureCurrency
@BuiltValue()
abstract class CreateCaptureCurrency
    implements Built<CreateCaptureCurrency, CreateCaptureCurrencyBuilder> {
  /// Any Of [String]
  AnyOf get anyOf;

  CreateCaptureCurrency._();

  factory CreateCaptureCurrency([void updates(CreateCaptureCurrencyBuilder b)]) =
      _$CreateCaptureCurrency;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(CreateCaptureCurrencyBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<CreateCaptureCurrency> get serializer => _$CreateCaptureCurrencySerializer();
}

class _$CreateCaptureCurrencySerializer implements PrimitiveSerializer<CreateCaptureCurrency> {
  @override
  final Iterable<Type> types = const [CreateCaptureCurrency, _$CreateCaptureCurrency];

  @override
  final String wireName = r'CreateCaptureCurrency';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    CreateCaptureCurrency object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {}

  @override
  Object serialize(
    Serializers serializers,
    CreateCaptureCurrency object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final anyOf = object.anyOf;
    return serializers.serialize(
      anyOf,
      specifiedType: FullType(AnyOf, anyOf.types.map((type) => FullType(type)).toList()),
    )!;
  }

  @override
  CreateCaptureCurrency deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = CreateCaptureCurrencyBuilder();
    Object? anyOfDataSrc;
    final targetType = const FullType(AnyOf, [FullType(AnyOf0Enum), FullType(String)]);
    anyOfDataSrc = serialized;
    result.anyOf = serializers.deserialize(anyOfDataSrc, specifiedType: targetType) as AnyOf;
    return result.build();
  }
}
