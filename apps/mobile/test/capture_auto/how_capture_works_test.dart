// "¿Cómo funciona?": the five steps of automatic capture in a sheet, on the first switch on (ending
// with "Activar acceso") and from the section's link (ending with "Entendido").
import 'dart:ui' show Tristate;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/capture_auto/auto_capture_section.dart';
import 'package:wambito/capture_auto/capture_platform.dart';
import 'package:wambito/capture_auto/how_capture_works.dart';

import '../settings/harness.dart';
import 'fakes.dart';

Future<(SettingsEnv, FakeAutoCapturePlatform)> _pump(WidgetTester t) async {
  final fake = FakeAutoCapturePlatform();
  final env = await pumpSettingsApp(
    t,
    location: '/settings',
    overrides: [autoCapturePlatformProvider.overrideWithValue(fake)],
  );
  return (env, fake);
}

Future<void> _show(WidgetTester t, Key key) async {
  await t.scrollUntilVisible(find.byKey(key), 300, scrollable: find.byType(Scrollable).first);
  await t.pumpAndSettle();
}

Future<void> _tap(WidgetTester t, Key key) async {
  await t.ensureVisible(find.byKey(key));
  await t.pumpAndSettle();
  await t.tap(find.byKey(key));
  await t.pumpAndSettle();
}

Future<void> _toLastStep(WidgetTester t) async {
  for (var i = 0; i < 4; i++) {
    await _tap(t, const Key('autoCapture.how.next'));
  }
}

Future<void> _switchOn(WidgetTester t) async {
  await _show(t, const Key('autoCapture.revolut'));
  await t.tap(find.byKey(const Key('autoCapture.revolut')));
  await t.pumpAndSettle();
}

const _confirm = Key('autoCapture.explainer.confirm');

void main() {
  testWidgets('first switch-on shows the steps and Activar acceso turns the source on', (t) async {
    final (env, fake) = await _pump(t);
    await _switchOn(t);

    expect(find.byType(HowCaptureWorks), findsOneWidget);
    expect(find.text('Pagas como siempre'), findsOneWidget);
    expect(fake.callsNamed('setSource'), isEmpty);

    await _toLastStep(t);
    await _tap(t, _confirm);

    expect(find.byType(HowCaptureWorks), findsNothing);
    final order = fake.calls.where((c) => c.startsWith('setSource') || c == 'openAccessSettings');
    expect(order, ['setSource revolut true', 'openAccessSettings']);
    expect(env.container.read(autoCaptureExplainedProvider), isTrue);
  });

  testWidgets('closing the steps keeps the source off', (t) async {
    final (env, fake) = await _pump(t);
    await _switchOn(t);
    expect(find.byType(HowCaptureWorks), findsOneWidget);

    await t.binding.handlePopRoute();
    await t.pumpAndSettle();

    expect(find.byType(HowCaptureWorks), findsNothing);
    expect(fake.callsNamed('setSource'), isEmpty);
    expect(env.container.read(autoCaptureExplainedProvider), isFalse);

    await t.tap(find.byKey(const Key('autoCapture.revolut')));
    await t.pumpAndSettle();
    expect(find.byType(HowCaptureWorks), findsOneWidget);
  });

  testWidgets('the last step carries the disclosure', (t) async {
    await _pump(t);
    await _switchOn(t);

    for (var i = 0; i < 4; i++) {
      await t.fling(find.byType(PageView), const Offset(-300, 0), 1000);
      await t.pumpAndSettle();
    }

    expect(find.text('Hoy y lo que viene'), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        'Wambito lee las notificaciones de las apps que actives. El texto nunca sale de tu '
        'teléfono.',
      ),
      findsOneWidget,
    );
    expect(find.byKey(_confirm), findsOneWidget);
    expect(find.byKey(const Key('autoCapture.how.next')), findsNothing);
  });

  testWidgets('Cómo funciona shows the steps and ends with Entendido', (t) async {
    final (_, fake) = await _pump(t);
    await _show(t, const Key('autoCapture.how'));
    await t.tap(find.byKey(const Key('autoCapture.how')));
    await t.pumpAndSettle();

    expect(find.byType(HowCaptureWorks), findsOneWidget);
    await _toLastStep(t);

    expect(find.byKey(const Key('autoCapture.how.done')), findsOneWidget);
    expect(find.byKey(_confirm), findsNothing);

    await _tap(t, const Key('autoCapture.how.done'));

    expect(find.byType(HowCaptureWorks), findsNothing);
    expect(fake.callsNamed('setSource'), isEmpty);
    expect(fake.callsNamed('openAccessSettings'), isEmpty);
  });

  testWidgets('swiping and Siguiente move steps', (t) async {
    await _pump(t);
    await _switchOn(t);

    await t.fling(find.byType(PageView), const Offset(-300, 0), 1000);
    await t.pumpAndSettle();
    expect(find.text('Wambito la lee en tu teléfono'), findsOneWidget);
    expect(find.text('Pagas como siempre'), findsNothing);

    await _tap(t, const Key('autoCapture.how.next'));
    expect(find.text('Te avisa y tú decides'), findsOneWidget);
    bool selected(int dot) =>
        t.getSemantics(find.byKey(Key('autoCapture.how.dot.$dot'))).flagsCollection.isSelected ==
        Tristate.isTrue;
    expect(selected(2), isTrue);
    expect(selected(1), isFalse);

    await _tap(t, const Key('autoCapture.how.dot.0'));
    expect(find.text('Pagas como siempre'), findsOneWidget);
  });

  testWidgets('reduced motion jumps between steps', (t) async {
    t.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(
      disableAnimations: true,
    );
    addTearDown(t.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await _pump(t);
    await _switchOn(t);
    expect(t.binding.platformDispatcher.accessibilityFeatures.disableAnimations, isTrue);

    await t.tap(find.byKey(const Key('autoCapture.how.next')));
    await t.pump();

    expect(find.text('Wambito la lee en tu teléfono'), findsOneWidget);
    expect(find.text('Pagas como siempre'), findsNothing);
  });

  testWidgets('fits a 360 dp phone', (t) async {
    await _pump(t);
    t.view
      ..physicalSize = const Size(360, 740) * 3
      ..devicePixelRatio = 3;
    await t.pumpAndSettle();
    await _show(t, const Key('autoCapture.how'));
    await t.tap(find.byKey(const Key('autoCapture.how')));
    await t.pumpAndSettle();

    for (var i = 0; i < 5; i++) {
      expect(t.takeException(), isNull, reason: 'step $i');
      if (i < 4) await _tap(t, const Key('autoCapture.how.next'));
    }
    expect(find.byKey(const Key('autoCapture.how.done')), findsOneWidget);
  });
}
