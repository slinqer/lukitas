@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/capture_auto/capture_demos.dart';
import 'package:wambito/capture_auto/how_capture_works.dart';

import '../support/parity.dart';

/// Automatic capture's "how it works" against apps/web/app/features/capture: each step
/// (`CaptureStep.stories.tsx`, `capture-step--*`) and the main picture
/// (`CaptureMainPicture.stories.tsx`, `capture-mainpicture--night`), in night.
///
/// Update the goldens with `flutter test --update-goldens test/parity/capture_how_parity_test.dart`,
/// then compare with `dart run tool/parity/compose.dart --max 2 capture-` (docs/mobile/parity.md).

/// The stories' roots are blocks (`.lk-capture-step`, `.lk-capture-demo`: flex columns).
Widget _story(Widget child) => ParityStoryFrame(block: true, child: cssBlock(child: child));

/// Decodes the step's scene (a WebP) before the picture, as the browser has it loaded.
Future<void> _scene(WidgetTester t, CaptureHowStep step) => t.runAsync(() async {
  final context = t.element(find.byType(CaptureHowStepView));
  await precacheImage(AssetImage('assets/wambi/capture-step${step.index + 1}.webp'), context);
});

/// Each step's pair (the ids spelled out: harness_test looks for them in this file).
const _pairs = {
  CaptureHowStep.pay: 'capture-step-pay',
  CaptureHowStep.reads: 'capture-step-reads',
  CaptureHowStep.decide: 'capture-step-decide',
  CaptureHowStep.learns: 'capture-step-learns',
  CaptureHowStep.next: 'capture-step-next',
};

void main() {
  for (final MapEntry(key: step, value: id) in _pairs.entries) {
    testWidgets('capture how parity: step ${step.name} (night)', (t) async {
      await parityGolden(
        t,
        id,
        _story(CaptureHowStepView(step: step)),
        theme: 'night',
        act: (t) => _scene(t, step),
      );
    });
  }

  testWidgets('capture how parity: main picture (night)', (t) async {
    await parityGolden(t, 'capture-main-picture', _story(const MainPicture()), theme: 'night');
  });
}
