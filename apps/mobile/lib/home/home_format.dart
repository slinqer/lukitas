import 'dart:async';

import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import '../l10n/app_localizations.dart';
import 'day_groups.dart';
import 'wambi_line.dart';

/// The tag `intl` writes dates with for the app's [locale]. A bare `pt` is Brazilian in CLDR; the
/// web writes European Portuguese (`Intl` with `pt-PT`), so the app does too. Its data is loaded
/// here (the Material localizations only load the bare `pt`); the call is synchronous in effect
/// and does nothing the second time.
String dateTag(String locale) {
  if (locale != 'pt') return locale;
  unawaited(initializeDateFormatting('pt_PT'));
  return 'pt_PT';
}

/// Short weekday plus day of month: es `mié 21`, en `Wed 21` (the web's `formatDay`). [date] is
/// `YYYY-MM-DD`.
String formatDay(String date, String locale) {
  final p = date.split('-').map(int.parse).toList();
  final d = DateTime.utc(p[0], p[1], p[2]);
  final weekday = DateFormat.E(dateTag(locale)).format(d).replaceFirst(RegExp(r'\.$'), '');
  return '$weekday ${d.day}';
}

/// A month's name, capitalized: es `Octubre`, en `October` (the web's `formatMonth`). [month] is
/// `YYYY-MM`.
String formatMonthName(String month, String locale) {
  final p = month.split('-').map(int.parse).toList();
  final name = DateFormat.MMMM(dateTag(locale)).format(DateTime.utc(p[0], p[1]));
  return name.isEmpty ? name : name[0].toUpperCase() + name.substring(1);
}

/// A month's name in the middle of a sentence: lowercase in Spanish (`mostrando octubre`), as is in
/// English (`showing October`) (the web's `monthInSentence`).
String monthInSentence(String month, String locale) {
  final name = formatMonthName(month, locale);
  return locale == 'en' ? name : name.toLowerCase();
}

/// The words of [line], from the catalog: one of its three [variant]s (1 to 3) when it has them.
/// [money] writes cents in the person's currency and language.
String wambiLineText(AppLocalizations l, WambiLine line, int variant, String Function(int) money) {
  final v = ((variant - 1) % 3) + 1;
  return switch (line.key) {
    WambiKey.firstOfDay => switch (v) {
      1 => l.wambiFirstOfDay1(line.name),
      2 => l.wambiFirstOfDay2(line.name),
      _ => l.wambiFirstOfDay3(line.name),
    },
    WambiKey.onTrack => switch (v) {
      1 => l.wambiOnTrack1(money(line.remaining), line.daysLeft),
      2 => l.wambiOnTrack2(money(line.remaining), line.daysLeft),
      _ => l.wambiOnTrack3(money(line.remaining), line.daysLeft),
    },
    WambiKey.nearLimit => switch (v) {
      1 => l.wambiNearLimit1(line.category, money(line.remaining)),
      2 => l.wambiNearLimit2(line.category, money(line.remaining)),
      _ => l.wambiNearLimit3(line.category, money(line.remaining)),
    },
    WambiKey.overBudget => switch (v) {
      1 => l.wambiOverBudget1(line.category, money(line.over)),
      2 => l.wambiOverBudget2(line.category, money(line.over)),
      _ => l.wambiOverBudget3(line.category, money(line.over)),
    },
    WambiKey.incomeReceived => switch (v) {
      1 => l.wambiIncomeReceived1(line.name, money(line.amount)),
      2 => l.wambiIncomeReceived2(line.name, money(line.amount)),
      _ => l.wambiIncomeReceived3(line.name, money(line.amount)),
    },
    WambiKey.pendingPaid => switch (v) {
      1 => l.wambiPendingPaid1(line.name, money(line.amount)),
      2 => l.wambiPendingPaid2(line.name, money(line.amount)),
      _ => l.wambiPendingPaid3(line.name, money(line.amount)),
    },
    WambiKey.monthLastDay => switch (v) {
      1 => l.wambiMonthLastDay1(money(line.remaining)),
      2 => l.wambiMonthLastDay2(money(line.remaining)),
      _ => l.wambiMonthLastDay3(money(line.remaining)),
    },
    WambiKey.monthClosedGreen => switch (v) {
      1 => l.wambiMonthClosedGreen1(money(line.remaining)),
      2 => l.wambiMonthClosedGreen2(money(line.remaining)),
      _ => l.wambiMonthClosedGreen3(money(line.remaining)),
    },
    WambiKey.empty => l.wambiEmpty,
    WambiKey.noBudget => l.wambiNoBudget(money(line.spent)),
    WambiKey.overTotal => l.wambiOverTotal(money(line.over)),
  };
}

/// A day's heading on a list of movements: today and yesterday and the days to come say so, the
/// others are the day itself (the web's `Day`, apps/web/app/features/home/Home.tsx).
String dayHeadingLabel(AppLocalizations l10n, DayGroup group) {
  final day = formatDay(group.date, l10n.localeName);
  return switch (group.when) {
    DayWhen.today => l10n.homeDayToday(day),
    DayWhen.yesterday => l10n.homeDayYesterday(day),
    DayWhen.upcoming => l10n.homeDayUpcoming(day),
    DayWhen.past => day,
  };
}
