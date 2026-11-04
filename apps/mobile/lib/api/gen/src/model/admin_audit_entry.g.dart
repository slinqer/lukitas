// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_audit_entry.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAuditEntry extends AdminAuditEntry {
  @override
  final String id;
  @override
  final String at;
  @override
  final String? adminUserId;
  @override
  final String action;
  @override
  final String? targetUserId;
  @override
  final String? emailHash;
  @override
  final String? reason;
  @override
  final BuiltMap<String, String>? detail;

  factory _$AdminAuditEntry([void Function(AdminAuditEntryBuilder)? updates]) =>
      (AdminAuditEntryBuilder()..update(updates))._build();

  _$AdminAuditEntry._({
    required this.id,
    required this.at,
    this.adminUserId,
    required this.action,
    this.targetUserId,
    this.emailHash,
    this.reason,
    this.detail,
  }) : super._();
  @override
  AdminAuditEntry rebuild(void Function(AdminAuditEntryBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAuditEntryBuilder toBuilder() => AdminAuditEntryBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAuditEntry &&
        id == other.id &&
        at == other.at &&
        adminUserId == other.adminUserId &&
        action == other.action &&
        targetUserId == other.targetUserId &&
        emailHash == other.emailHash &&
        reason == other.reason &&
        detail == other.detail;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, at.hashCode);
    _$hash = $jc(_$hash, adminUserId.hashCode);
    _$hash = $jc(_$hash, action.hashCode);
    _$hash = $jc(_$hash, targetUserId.hashCode);
    _$hash = $jc(_$hash, emailHash.hashCode);
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jc(_$hash, detail.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAuditEntry')
          ..add('id', id)
          ..add('at', at)
          ..add('adminUserId', adminUserId)
          ..add('action', action)
          ..add('targetUserId', targetUserId)
          ..add('emailHash', emailHash)
          ..add('reason', reason)
          ..add('detail', detail))
        .toString();
  }
}

class AdminAuditEntryBuilder implements Builder<AdminAuditEntry, AdminAuditEntryBuilder> {
  _$AdminAuditEntry? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _at;
  String? get at => _$this._at;
  set at(String? at) => _$this._at = at;

  String? _adminUserId;
  String? get adminUserId => _$this._adminUserId;
  set adminUserId(String? adminUserId) => _$this._adminUserId = adminUserId;

  String? _action;
  String? get action => _$this._action;
  set action(String? action) => _$this._action = action;

  String? _targetUserId;
  String? get targetUserId => _$this._targetUserId;
  set targetUserId(String? targetUserId) => _$this._targetUserId = targetUserId;

  String? _emailHash;
  String? get emailHash => _$this._emailHash;
  set emailHash(String? emailHash) => _$this._emailHash = emailHash;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  MapBuilder<String, String>? _detail;
  MapBuilder<String, String> get detail => _$this._detail ??= MapBuilder<String, String>();
  set detail(MapBuilder<String, String>? detail) => _$this._detail = detail;

  AdminAuditEntryBuilder() {
    AdminAuditEntry._defaults(this);
  }

  AdminAuditEntryBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _at = $v.at;
      _adminUserId = $v.adminUserId;
      _action = $v.action;
      _targetUserId = $v.targetUserId;
      _emailHash = $v.emailHash;
      _reason = $v.reason;
      _detail = $v.detail?.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAuditEntry other) {
    _$v = other as _$AdminAuditEntry;
  }

  @override
  void update(void Function(AdminAuditEntryBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAuditEntry build() => _build();

  _$AdminAuditEntry _build() {
    _$AdminAuditEntry _$result;
    try {
      _$result =
          _$v ??
          _$AdminAuditEntry._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'AdminAuditEntry', 'id'),
            at: BuiltValueNullFieldError.checkNotNull(at, r'AdminAuditEntry', 'at'),
            adminUserId: adminUserId,
            action: BuiltValueNullFieldError.checkNotNull(action, r'AdminAuditEntry', 'action'),
            targetUserId: targetUserId,
            emailHash: emailHash,
            reason: reason,
            detail: _detail?.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'detail';
        _detail?.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'AdminAuditEntry', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
