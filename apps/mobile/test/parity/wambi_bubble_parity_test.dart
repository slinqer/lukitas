@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/home/wambi_face.dart';
import 'package:wambito/theme/surfaces.dart';
import 'package:wambito/theme/theme.dart';
import 'package:wambito/ui/wambi_bubble.dart';

import '../support/parity.dart';

/// `WambiBubble` against apps/web/app/ui/WambiBubble.stories.tsx (`wambi-wambibubble--*`), each
/// story as Storybook shows it after its `play` function, in night and in day (`CelebratingDay`
/// pins day). Wambi's sprite rests on its first frame, as the shots take it.
///
/// Update the goldens with `flutter test --update-goldens test/parity`, then compare with
/// `dart run tool/parity/compose.dart` (docs/mobile/parity.md).

/// The stories' decorator: `<div className="lk-screen max-w-[390px] p-(--space-4)">`.
Widget _screen(Widget child) => ParityStoryFrame(
  block: true,
  child: cssBlock(
    maxWidth: 390,
    child: Builder(
      builder: (context) => DecoratedBox(
        decoration: BoxDecoration(
          gradient: LkSurface.background(Theme.of(context).extension<WambitoTheme>()!.colors),
        ),
        child: Padding(padding: const EdgeInsets.all(16), child: child),
      ),
    ),
  ),
);

const _monthLine = 'Vas muy bien: te quedan 501,13 € para 11 días.';
const _paidLine = 'Pagaste «gym»: 32,00 €. Vas cumpliendo.';

/// The story's `AfterPayment`: the bubble and two scaffold buttons that are plain text.
class _AfterPayment extends StatefulWidget {
  const _AfterPayment();

  @override
  State<_AfterPayment> createState() => _AfterPaymentState();
}

class _AfterPaymentState extends State<_AfterPayment> {
  var _message = _monthLine;
  var _quietKey = 0;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.stretch,
    spacing: 12,
    children: [
      WambiBubble(message: _message, mood: WambiMood.happy, quietKey: _quietKey),
      _ScaffoldButton('pay', () => setState(() => _message = _paidLine)),
      _ScaffoldButton(
        'time passes',
        () => setState(() {
          _message = _monthLine;
          _quietKey++;
        }),
      ),
    ],
  );
}

/// A story's plain `<button>`: its text on the body's line, and Chrome's own focus ring when it
/// has keyboard focus (a 2px blue ring with a 1px white one outside it).
class _ScaffoldButton extends StatefulWidget {
  const _ScaffoldButton(this.label, this.onTap);

  final String label;
  final VoidCallback onTap;

  @override
  State<_ScaffoldButton> createState() => _ScaffoldButtonState();
}

class _ScaffoldButtonState extends State<_ScaffoldButton> {
  final _focus = FocusNode();
  var _ring = false;

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FocusableActionDetector(
    focusNode: _focus,
    onShowFocusHighlight: (shown) => setState(() => _ring = shown),
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        _focus.requestFocus();
        widget.onTap();
      },
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Center(child: Text(widget.label)),
          if (_ring) ...[
            for (final (inset, color, width) in [
              (-2.0, const Color(0xFFFFFFFF), 1.0),
              (-1.0, _chromeRing, 2.0),
            ])
              Positioned(
                left: inset,
                top: inset,
                right: inset,
                bottom: inset,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(3),
                    border: Border.all(color: color, width: width),
                  ),
                ),
              ),
          ],
        ],
      ),
    ),
  );
}

/// Chrome's focus ring on a button, as the shots draw it.
const _chromeRing = Color(0xFF005FCC);

Future<void> _keyboardMode(WidgetTester t) => t.sendKeyEvent(LogicalKeyboardKey.shiftLeft);

/// Wambi's sprite sheets decode in real time, which `pumpAndSettle` does not wait for: decode them
/// first, so the picture is taken with him in it.
Future<void> _sprites(WidgetTester t) async {
  await t.runAsync(() async {
    final context = t.element(find.byType(WambiBubble));
    for (final mood in WambiMood.values) {
      await precacheImage(AssetImage(mood.sheet), context);
    }
  });
  await t.pumpAndSettle();
}

void main() {
  for (final theme in ['night', 'day']) {
    testWidgets('wambi bubble parity: happy ($theme)', (t) async {
      await parityGolden(
        t,
        'wambi-bubble-happy',
        _screen(
          const WambiBubble(
            message: '¡Vas bien! Te quedan 11 días y aún tienes margen.',
            mood: WambiMood.happy,
          ),
        ),
        theme: theme,
        act: _sprites,
      );
    });

    testWidgets('wambi bubble parity: worried ($theme)', (t) async {
      await parityGolden(
        t,
        'wambi-bubble-worried',
        _screen(
          const WambiBubble(
            message: 'Ojo: ya te pasaste 20,20 € en Supermercado.',
            mood: WambiMood.worried,
          ),
        ),
        theme: theme,
        act: _sprites,
      );
    });

    testWidgets('wambi bubble parity: the payment line, then the month\'s again ($theme)', (
      t,
    ) async {
      await parityGolden(
        t,
        'wambi-bubble-payment-line',
        _screen(const _AfterPayment()),
        theme: theme,
        act: (t) async {
          await _sprites(t);
          await t.tap(find.text('pay'));
          await t.pumpAndSettle();
          await t.tap(find.text('time passes'));
          await t.pumpAndSettle();
          await _keyboardMode(t);
        },
      );
    });

    testWidgets('wambi bubble parity: the payment line, with no motion ($theme)', (t) async {
      await parityGolden(
        t,
        'wambi-bubble-payment-line-reduced-motion',
        _screen(const _AfterPayment()),
        theme: theme,
        act: (t) async {
          await _sprites(t);
          await t.tap(find.text('pay'));
          await t.pumpAndSettle();
          await _keyboardMode(t);
        },
      );
    });
  }

  testWidgets('wambi bubble parity: celebrating, day (day)', (t) async {
    await parityGolden(
      t,
      'wambi-bubble-celebrating-day',
      _screen(const WambiBubble(message: '¡Anotado!', mood: WambiMood.celebrating)),
      theme: 'day',
      act: _sprites,
    );
  });
}
