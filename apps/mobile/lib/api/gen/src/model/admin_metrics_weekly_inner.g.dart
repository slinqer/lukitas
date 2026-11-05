// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'admin_metrics_weekly_inner.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$AdminMetricsWeeklyInner extends AdminMetricsWeeklyInner {
  @override
  final String weekStart;
  @override
  final int withEmail;
  @override
  final int guests;

  factory _$AdminMetricsWeeklyInner([void Function(AdminMetricsWeeklyInnerBuilder)? updates]) =>
      (AdminMetricsWeeklyInnerBuilder()..update(updates))._build();

  _$AdminMetricsWeeklyInner._({
    required this.weekStart,
    required this.withEmail,
    required this.guests,
  }) : super._();
  @override
  AdminMetricsWeeklyInner rebuild(void Function(AdminMetricsWeeklyInnerBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  AdminMetricsWeeklyInnerBuilder toBuilder() => AdminMetricsWeeklyInnerBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is AdminMetricsWeeklyInner &&
        weekStart == other.weekStart &&
        withEmail == other.withEmail &&
        guests == other.guests;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, weekStart.hashCode);
    _$hash = $jc(_$hash, withEmail.hashCode);
    _$hash = $jc(_$hash, guests.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'AdminMetricsWeeklyInner')
          ..add('weekStart', weekStart)
          ..add('withEmail', withEmail)
          ..add('guests', guests))
        .toString();
  }
}

class AdminMetricsWeeklyInnerBuilder
    implements Builder<AdminMetricsWeeklyInner, AdminMetricsWeeklyInnerBuilder> {
  _$AdminMetricsWeeklyInner? _$v;

  String? _weekStart;
  String? get weekStart => _$this._weekStart;
  set weekStart(String? weekStart) => _$this._weekStart = weekStart;

  int? _withEmail;
  int? get withEmail => _$this._withEmail;
  set withEmail(int? withEmail) => _$this._withEmail = withEmail;

  int? _guests;
  int? get guests => _$this._guests;
  set guests(int? guests) => _$this._guests = guests;

  AdminMetricsWeeklyInnerBuilder() {
    AdminMetricsWeeklyInner._defaults(this);
  }

  AdminMetricsWeeklyInnerBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _weekStart = $v.weekStart;
      _withEmail = $v.withEmail;
      _guests = $v.guests;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(AdminMetricsWeeklyInner other) {
    _$v = other as _$AdminMetricsWeeklyInner;
  }

  @override
  void update(void Function(AdminMetricsWeeklyInnerBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  AdminMetricsWeeklyInner build() => _build();

  _$AdminMetricsWeeklyInner _build() {
    final _$result =
        _$v ??
        _$AdminMetricsWeeklyInner._(
          weekStart: BuiltValueNullFieldError.checkNotNull(
            weekStart,
            r'AdminMetricsWeeklyInner',
            'weekStart',
          ),
          withEmail: BuiltValueNullFieldError.checkNotNull(
            withEmail,
            r'AdminMetricsWeeklyInner',
            'withEmail',
          ),
          guests: BuiltValueNullFieldError.checkNotNull(
            guests,
            r'AdminMetricsWeeklyInner',
            'guests',
          ),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
