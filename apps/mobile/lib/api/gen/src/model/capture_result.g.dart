// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'capture_result.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

const CaptureResultResultEnum _$captureResultResultEnum_created = const CaptureResultResultEnum._(
  'created',
);
const CaptureResultResultEnum _$captureResultResultEnum_merged = const CaptureResultResultEnum._(
  'merged',
);

CaptureResultResultEnum _$captureResultResultEnumValueOf(String name) {
  switch (name) {
    case 'created':
      return _$captureResultResultEnum_created;
    case 'merged':
      return _$captureResultResultEnum_merged;
    default:
      throw ArgumentError(name);
  }
}

final BuiltSet<CaptureResultResultEnum> _$captureResultResultEnumValues =
    BuiltSet<CaptureResultResultEnum>(const <CaptureResultResultEnum>[
      _$captureResultResultEnum_created,
      _$captureResultResultEnum_merged,
    ]);

Serializer<CaptureResultResultEnum> _$captureResultResultEnumSerializer =
    _$CaptureResultResultEnumSerializer();

class _$CaptureResultResultEnumSerializer implements PrimitiveSerializer<CaptureResultResultEnum> {
  static const Map<String, Object> _toWire = const <String, Object>{
    'created': 'created',
    'merged': 'merged',
  };
  static const Map<Object, String> _fromWire = const <Object, String>{
    'created': 'created',
    'merged': 'merged',
  };

  @override
  final Iterable<Type> types = const <Type>[CaptureResultResultEnum];
  @override
  final String wireName = 'CaptureResultResultEnum';

  @override
  Object serialize(
    Serializers serializers,
    CaptureResultResultEnum object, {
    FullType specifiedType = FullType.unspecified,
  }) => _toWire[object.name] ?? object.name;

  @override
  CaptureResultResultEnum deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) => CaptureResultResultEnum.valueOf(
    _fromWire[serialized] ?? (serialized is String ? serialized : ''),
  );
}

class _$CaptureResult extends CaptureResult {
  @override
  final CaptureResultResultEnum result;
  @override
  final CaptureResultTransaction transaction;
  @override
  final CaptureResultCategory category;

  factory _$CaptureResult([void Function(CaptureResultBuilder)? updates]) =>
      (CaptureResultBuilder()..update(updates))._build();

  _$CaptureResult._({required this.result, required this.transaction, required this.category})
    : super._();
  @override
  CaptureResult rebuild(void Function(CaptureResultBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CaptureResultBuilder toBuilder() => CaptureResultBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CaptureResult &&
        result == other.result &&
        transaction == other.transaction &&
        category == other.category;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, result.hashCode);
    _$hash = $jc(_$hash, transaction.hashCode);
    _$hash = $jc(_$hash, category.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CaptureResult')
          ..add('result', result)
          ..add('transaction', transaction)
          ..add('category', category))
        .toString();
  }
}

class CaptureResultBuilder implements Builder<CaptureResult, CaptureResultBuilder> {
  _$CaptureResult? _$v;

  CaptureResultResultEnum? _result;
  CaptureResultResultEnum? get result => _$this._result;
  set result(CaptureResultResultEnum? result) => _$this._result = result;

  CaptureResultTransactionBuilder? _transaction;
  CaptureResultTransactionBuilder get transaction =>
      _$this._transaction ??= CaptureResultTransactionBuilder();
  set transaction(CaptureResultTransactionBuilder? transaction) =>
      _$this._transaction = transaction;

  CaptureResultCategoryBuilder? _category;
  CaptureResultCategoryBuilder get category => _$this._category ??= CaptureResultCategoryBuilder();
  set category(CaptureResultCategoryBuilder? category) => _$this._category = category;

  CaptureResultBuilder() {
    CaptureResult._defaults(this);
  }

  CaptureResultBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _result = $v.result;
      _transaction = $v.transaction.toBuilder();
      _category = $v.category.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CaptureResult other) {
    _$v = other as _$CaptureResult;
  }

  @override
  void update(void Function(CaptureResultBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CaptureResult build() => _build();

  _$CaptureResult _build() {
    _$CaptureResult _$result;
    try {
      _$result =
          _$v ??
          _$CaptureResult._(
            result: BuiltValueNullFieldError.checkNotNull(result, r'CaptureResult', 'result'),
            transaction: transaction.build(),
            category: category.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'transaction';
        transaction.build();
        _$failedField = 'category';
        category.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'CaptureResult', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
