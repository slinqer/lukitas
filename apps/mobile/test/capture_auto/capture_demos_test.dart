// The demos of "¿Cómo funciona?" follow the theme: the bank's notification is a dark plum card at
// night and a light card by day, as Android's own notifications follow the phone's mode.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/capture_auto/capture_demos.dart';
import 'package:wambito/l10n/app_localizations.dart';
import 'package:wambito/theme/theme.dart';
import 'package:wambito/theme/tokens.g.dart';
import 'package:wambito/ui/lk_theme.dart';

/// Pumps the main picture in [theme] and answers its colors.
Future<WambitoColors> _pump(WidgetTester t, ThemeData theme) async {
  late WambitoColors colors;
  await t.pumpWidget(
    MaterialApp(
      theme: theme,
      locale: const Locale('es'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Material(
        child: Builder(
          builder: (context) {
            colors = context.lkColors;
            return const SingleChildScrollView(child: MainPicture());
          },
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
  return colors;
}

/// The cards (wider than the 36 px icon tile) painted [color].
Finder _cards(Color color) => find.byWidgetPredicate(
  (w) =>
      w is Container &&
      w.decoration is BoxDecoration &&
      (w.decoration! as BoxDecoration).color == color &&
      (w.constraints?.maxWidth ?? double.infinity) > 36,
);

void main() {
  testWidgets('the bank notification is a plum card at night', (t) async {
    final colors = await _pump(t, nightTheme);
    expect(_cards(colors.brandPlum), findsOneWidget);
  });

  testWidgets('the bank notification is a light card by day', (t) async {
    final colors = await _pump(t, dayTheme);
    expect(_cards(colors.brandPlum), findsNothing, reason: 'only its icon tile is plum by day');
    expect(_cards(colors.surface), findsWidgets);
  });
}
