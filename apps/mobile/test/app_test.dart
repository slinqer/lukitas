import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/app.dart';
import 'package:wambito/api/server_url.dart';
import 'package:wambito/l10n/app_localizations.dart';
import 'package:wambito/settings/initial_settings.dart';
import 'package:wambito/theme/tokens.g.dart';

import 'entry/fakes.dart';

void main() {
  testWidgets('night is the default theme, even on a light phone', (tester) async {
    // Signed out, on the real providers: the first-run screen.
    mockStorage();
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    await tester.pumpWidget(const ProviderScope(child: WambitoApp()));
    await tester.pumpAndSettle();

    // The wordmark above, and the title of the first-run screen.
    expect(find.text('Wambito'), findsNWidgets(2));

    final theme = Theme.of(tester.element(find.byType(Scaffold)));
    expect(theme.brightness, Brightness.dark);
    expect(theme.scaffoldBackgroundColor, WambitoTokens.night.bg);
    expect(theme.colorScheme.primary, WambitoTokens.night.brand);
  });

  testWidgets('"System" follows the phone: a light phone gets day', (tester) async {
    mockStorage();
    tester.platformDispatcher.platformBrightnessTestValue = Brightness.light;
    addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          initialSettingsProvider.overrideWithValue(
            InitialSettings(serverUrl: defaultServerUrl, themeMode: ThemeMode.system),
          ),
        ],
        child: const WambitoApp(),
      ),
    );
    await tester.pumpAndSettle();

    final theme = Theme.of(tester.element(find.byType(Scaffold)));
    expect(theme.brightness, Brightness.light);
    expect(theme.scaffoldBackgroundColor, WambitoTokens.day.bg);
  });

  testWidgets('the language follows the phone when it is Spanish or English, else Spanish', (
    tester,
  ) async {
    mockStorage();
    Future<String> wordsFor(Locale locale) async {
      tester.platformDispatcher.localesTestValue = [locale];
      addTearDown(tester.platformDispatcher.clearLocalesTestValue);
      await tester.pumpWidget(const ProviderScope(child: WambitoApp()));
      await tester.pumpAndSettle();
      return AppLocalizations.of(tester.element(find.byType(Scaffold))).localeName;
    }

    expect(await wordsFor(const Locale('en', 'GB')), 'en');
    expect(await wordsFor(const Locale('es', 'CO')), 'es');
    expect(await wordsFor(const Locale('fr')), 'es');
  });
}
