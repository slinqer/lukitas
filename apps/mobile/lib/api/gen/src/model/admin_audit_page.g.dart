// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_audit_page.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminAuditPage extends AdminAuditPage {
  @override
  final BuiltList<AdminAuditEntry> entries;
  @override
  final String? next;

  factory _$AdminAuditPage([void Function(AdminAuditPageBuilder)? updates]) =>
      (AdminAuditPageBuilder()..update(updates))._build();

  _$AdminAuditPage._({required this.entries, this.next}) : super._();
  @override
  AdminAuditPage rebuild(void Function(AdminAuditPageBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminAuditPageBuilder toBuilder() => AdminAuditPageBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminAuditPage && entries == other.entries && next == other.next;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, entries.hashCode);
    _$hash = $jc(_$hash, next.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminAuditPage')
          ..add('entries', entries)
          ..add('next', next))
        .toString();
  }
}

class AdminAuditPageBuilder implements Builder<AdminAuditPage, AdminAuditPageBuilder> {
  _$AdminAuditPage? _$v;

  ListBuilder<AdminAuditEntry>? _entries;
  ListBuilder<AdminAuditEntry> get entries => _$this._entries ??= ListBuilder<AdminAuditEntry>();
  set entries(ListBuilder<AdminAuditEntry>? entries) => _$this._entries = entries;

  String? _next;
  String? get next => _$this._next;
  set next(String? next) => _$this._next = next;

  AdminAuditPageBuilder() {
    AdminAuditPage._defaults(this);
  }

  AdminAuditPageBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _entries = $v.entries.toBuilder();
      _next = $v.next;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminAuditPage other) {
    _$v = other as _$AdminAuditPage;
  }

  @override
  void update(void Function(AdminAuditPageBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminAuditPage build() => _build();

  _$AdminAuditPage _build() {
    _$AdminAuditPage _$result;
    try {
      _$result = _$v ?? _$AdminAuditPage._(entries: entries.build(), next: next);
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'entries';
        entries.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'AdminAuditPage', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
