//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'email_change_confirm.g.dart';

/// EmailChangeConfirm
///
/// Properties:
/// * [token]
@BuiltValue()
abstract class EmailChangeConfirm implements Built<EmailChangeConfirm, EmailChangeConfirmBuilder> {
  @BuiltValueField(wireName: r'token')
  String get token;

  EmailChangeConfirm._();

  factory EmailChangeConfirm([void updates(EmailChangeConfirmBuilder b)]) = _$EmailChangeConfirm;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(EmailChangeConfirmBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<EmailChangeConfirm> get serializer => _$EmailChangeConfirmSerializer();
}

class _$EmailChangeConfirmSerializer implements PrimitiveSerializer<EmailChangeConfirm> {
  @override
  final Iterable<Type> types = const [EmailChangeConfirm, _$EmailChangeConfirm];

  @override
  final String wireName = r'EmailChangeConfirm';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    EmailChangeConfirm object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'token';
    yield serializers.serialize(object.token, specifiedType: const FullType(String));
  }

  @override
  Object serialize(
    Serializers serializers,
    EmailChangeConfirm object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required EmailChangeConfirmBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'token':
          final valueDes =
              serializers.deserialize(value, specifiedType: const FullType(String)) as String;
          result.token = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  EmailChangeConfirm deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = EmailChangeConfirmBuilder();
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
