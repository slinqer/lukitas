// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_user.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminUser extends AdminUser {
  @override
  final String id;
  @override
  final String? email;
  @override
  final bool isAnonymous;
  @override
  final String locale;
  @override
  final String createdAt;
  @override
  final String? lastActiveAt;
  @override
  final String? suspendedAt;
  @override
  final int sessionCount;
  @override
  final BuiltList<AdminUserPasskeysInner> passkeys;
  @override
  final BuiltList<AdminUserAssistantsInner> assistants;

  factory _$AdminUser([void Function(AdminUserBuilder)? updates]) =>
      (AdminUserBuilder()..update(updates))._build();

  _$AdminUser._({
    required this.id,
    this.email,
    required this.isAnonymous,
    required this.locale,
    required this.createdAt,
    this.lastActiveAt,
    this.suspendedAt,
    required this.sessionCount,
    required this.passkeys,
    required this.assistants,
  }) : super._();
  @override
  AdminUser rebuild(void Function(AdminUserBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminUserBuilder toBuilder() => AdminUserBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminUser &&
        id == other.id &&
        email == other.email &&
        isAnonymous == other.isAnonymous &&
        locale == other.locale &&
        createdAt == other.createdAt &&
        lastActiveAt == other.lastActiveAt &&
        suspendedAt == other.suspendedAt &&
        sessionCount == other.sessionCount &&
        passkeys == other.passkeys &&
        assistants == other.assistants;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, isAnonymous.hashCode);
    _$hash = $jc(_$hash, locale.hashCode);
    _$hash = $jc(_$hash, createdAt.hashCode);
    _$hash = $jc(_$hash, lastActiveAt.hashCode);
    _$hash = $jc(_$hash, suspendedAt.hashCode);
    _$hash = $jc(_$hash, sessionCount.hashCode);
    _$hash = $jc(_$hash, passkeys.hashCode);
    _$hash = $jc(_$hash, assistants.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminUser')
          ..add('id', id)
          ..add('email', email)
          ..add('isAnonymous', isAnonymous)
          ..add('locale', locale)
          ..add('createdAt', createdAt)
          ..add('lastActiveAt', lastActiveAt)
          ..add('suspendedAt', suspendedAt)
          ..add('sessionCount', sessionCount)
          ..add('passkeys', passkeys)
          ..add('assistants', assistants))
        .toString();
  }
}

class AdminUserBuilder implements Builder<AdminUser, AdminUserBuilder> {
  _$AdminUser? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  bool? _isAnonymous;
  bool? get isAnonymous => _$this._isAnonymous;
  set isAnonymous(bool? isAnonymous) => _$this._isAnonymous = isAnonymous;

  String? _locale;
  String? get locale => _$this._locale;
  set locale(String? locale) => _$this._locale = locale;

  String? _createdAt;
  String? get createdAt => _$this._createdAt;
  set createdAt(String? createdAt) => _$this._createdAt = createdAt;

  String? _lastActiveAt;
  String? get lastActiveAt => _$this._lastActiveAt;
  set lastActiveAt(String? lastActiveAt) => _$this._lastActiveAt = lastActiveAt;

  String? _suspendedAt;
  String? get suspendedAt => _$this._suspendedAt;
  set suspendedAt(String? suspendedAt) => _$this._suspendedAt = suspendedAt;

  int? _sessionCount;
  int? get sessionCount => _$this._sessionCount;
  set sessionCount(int? sessionCount) => _$this._sessionCount = sessionCount;

  ListBuilder<AdminUserPasskeysInner>? _passkeys;
  ListBuilder<AdminUserPasskeysInner> get passkeys =>
      _$this._passkeys ??= ListBuilder<AdminUserPasskeysInner>();
  set passkeys(ListBuilder<AdminUserPasskeysInner>? passkeys) => _$this._passkeys = passkeys;

  ListBuilder<AdminUserAssistantsInner>? _assistants;
  ListBuilder<AdminUserAssistantsInner> get assistants =>
      _$this._assistants ??= ListBuilder<AdminUserAssistantsInner>();
  set assistants(ListBuilder<AdminUserAssistantsInner>? assistants) =>
      _$this._assistants = assistants;

  AdminUserBuilder() {
    AdminUser._defaults(this);
  }

  AdminUserBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _email = $v.email;
      _isAnonymous = $v.isAnonymous;
      _locale = $v.locale;
      _createdAt = $v.createdAt;
      _lastActiveAt = $v.lastActiveAt;
      _suspendedAt = $v.suspendedAt;
      _sessionCount = $v.sessionCount;
      _passkeys = $v.passkeys.toBuilder();
      _assistants = $v.assistants.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminUser other) {
    _$v = other as _$AdminUser;
  }

  @override
  void update(void Function(AdminUserBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminUser build() => _build();

  _$AdminUser _build() {
    _$AdminUser _$result;
    try {
      _$result =
          _$v ??
          _$AdminUser._(
            id: BuiltValueNullFieldError.checkNotNull(id, r'AdminUser', 'id'),
            email: email,
            isAnonymous: BuiltValueNullFieldError.checkNotNull(
              isAnonymous,
              r'AdminUser',
              'isAnonymous',
            ),
            locale: BuiltValueNullFieldError.checkNotNull(locale, r'AdminUser', 'locale'),
            createdAt: BuiltValueNullFieldError.checkNotNull(createdAt, r'AdminUser', 'createdAt'),
            lastActiveAt: lastActiveAt,
            suspendedAt: suspendedAt,
            sessionCount: BuiltValueNullFieldError.checkNotNull(
              sessionCount,
              r'AdminUser',
              'sessionCount',
            ),
            passkeys: passkeys.build(),
            assistants: assistants.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'passkeys';
        passkeys.build();
        _$failedField = 'assistants';
        assistants.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(r'AdminUser', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
