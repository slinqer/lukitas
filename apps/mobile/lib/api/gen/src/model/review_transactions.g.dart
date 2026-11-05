// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'review_transactions.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ReviewTransactions extends ReviewTransactions {
  @override
  final BuiltList<String> ids;

  factory _$ReviewTransactions([void Function(ReviewTransactionsBuilder)? updates]) =>
      (ReviewTransactionsBuilder()..update(updates))._build();

  _$ReviewTransactions._({required this.ids}) : super._();
  @override
  ReviewTransactions rebuild(void Function(ReviewTransactionsBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ReviewTransactionsBuilder toBuilder() => ReviewTransactionsBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ReviewTransactions && ids == other.ids;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, ids.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ReviewTransactions')..add('ids', ids)).toString();
  }
}

class ReviewTransactionsBuilder implements Builder<ReviewTransactions, ReviewTransactionsBuilder> {
  _$ReviewTransactions? _$v;

  ListBuilder<String>? _ids;
  ListBuilder<String> get ids => _$this._ids ??= ListBuilder<String>();
  set ids(ListBuilder<String>? ids) => _$this._ids = ids;

  ReviewTransactionsBuilder() {
    ReviewTransactions._defaults(this);
  }

  ReviewTransactionsBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _ids = $v.ids.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ReviewTransactions other) {
    _$v = other as _$ReviewTransactions;
  }

  @override
  void update(void Function(ReviewTransactionsBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ReviewTransactions build() => _build();

  _$ReviewTransactions _build() {
    _$ReviewTransactions _$result;
    try {
      _$result = _$v ?? _$ReviewTransactions._(ids: ids.build());
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'ids';
        ids.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'ReviewTransactions', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
