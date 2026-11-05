// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_action_reason.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminActionReason extends AdminActionReason {
  @override
  final String reason;

  factory _$AdminActionReason([void Function(AdminActionReasonBuilder)? updates]) =>
      (AdminActionReasonBuilder()..update(updates))._build();

  _$AdminActionReason._({required this.reason}) : super._();
  @override
  AdminActionReason rebuild(void Function(AdminActionReasonBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminActionReasonBuilder toBuilder() => AdminActionReasonBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminActionReason && reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminActionReason')..add('reason', reason)).toString();
  }
}

class AdminActionReasonBuilder implements Builder<AdminActionReason, AdminActionReasonBuilder> {
  _$AdminActionReason? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  AdminActionReasonBuilder() {
    AdminActionReason._defaults(this);
  }

  AdminActionReasonBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminActionReason other) {
    _$v = other as _$AdminActionReason;
  }

  @override
  void update(void Function(AdminActionReasonBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminActionReason build() => _build();

  _$AdminActionReason _build() {
    final _$result =
        _$v ??
        _$AdminActionReason._(
          reason: BuiltValueNullFieldError.checkNotNull(reason, r'AdminActionReason', 'reason'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
