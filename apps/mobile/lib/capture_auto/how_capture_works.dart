// Automatic capture's "¿Cómo funciona?" (spec sections 4 and 5): the five steps in a sheet, one
// page each, swiped or moved with Siguiente and the dots. The web's twin is
// apps/web/app/features/capture/CaptureSteps.tsx (capture.css `.lk-capture-step`).
//
// It is also the prominent disclosure before notification access: on the first switch on the last
// step repeats what is read and that the text stays on the phone, right above "Activar acceso".
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../l10n/app_localizations.dart';
import '../theme/surfaces.dart';
import '../theme/text_styles.dart';
import '../theme/tokens.g.dart';
import '../ui/css_text.dart';
import '../ui/lk_theme.dart';
import '../ui/press_button.dart';
import '../ui/sheet.dart';
import 'capture_demos.dart';

/// The five steps, in order (the web's `CAPTURE_STEPS`).
enum CaptureHowStep { pay, reads, decide, learns, next }

/// Opens the steps. With [askAccess] (the first switch on) the last step ends with "Activar
/// acceso" and the answer is true when the person goes on; otherwise it ends with "Entendido".
/// Closing the sheet answers false.
///
/// The pages scroll with the sheet; the dots and the button (and, on the last step, the disclosure
/// right above it) stay at the sheet's bottom, always in view.
Future<bool> showHowCaptureWorks(BuildContext context, {required bool askAccess}) async {
  final l10n = AppLocalizations.of(context);
  final go = await LkSheet.show<bool>(
    context,
    title: askAccess ? l10n.autoCaptureTitle : l10n.autoCaptureHowLink,
    wrap: (sheet) => HowCaptureWorks(askAccess: askAccess, child: sheet),
    children: const [_HowPages()],
    stuck: const [_HowFooter()],
  );
  return go ?? false;
}

/// Holds the steps' state (the page in view and each page's height) for the sheet it wraps: the
/// pages in its body and the dots and button in its stuck footer.
class HowCaptureWorks extends StatefulWidget {
  const HowCaptureWorks({super.key, required this.askAccess, required this.child});

  /// The last step asks for notification access ("Activar acceso") instead of "Entendido".
  final bool askAccess;

  /// The sheet.
  final Widget child;

  @override
  State<HowCaptureWorks> createState() => _HowCaptureWorksState();
}

class _HowCaptureWorksState extends State<HowCaptureWorks> {
  final _controller = PageController();
  int _page = 0;

  /// Each page's own height, measured as it is laid out: the pages sit in a sheet that scrolls as a
  /// whole, so the page view takes the height of the page in view (between two while swiping).
  final _heights = <int, double>{};

  static final _last = CaptureHowStep.values.length - 1;

  /// The height before any page is measured: the scene, its gap, a title line and two body lines,
  /// so the first frame does not draw an empty page view.
  static const _fallbackHeight = 200 + 2 * WambitoTokens.space2 + 22 * 1.2 + 2 * 15 * 1.45;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _go(int page) {
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.jumpToPage(page);
    } else {
      _controller.animateToPage(
        page,
        duration: WambitoTokens.durationSheet,
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _turned(int page) => setState(() => _page = page);

  void _measured(int page, double height) {
    if (_heights[page] == height || !mounted) return;
    setState(() => _heights[page] = height);
  }

  double _height() {
    final known =
        _heights[_page] ??
        (_heights.isEmpty ? _fallbackHeight : _heights.values.reduce((a, b) => a > b ? a : b));
    if (!_controller.hasClients || !_controller.position.haveDimensions) return known;
    final page = _controller.page ?? _page.toDouble();
    final low = page.floor().clamp(0, _last);
    final high = page.ceil().clamp(0, _last);
    final from = _heights[low] ?? known;
    final to = _heights[high] ?? from;
    return lerpDouble(from, to, page - low)!;
  }

  @override
  Widget build(BuildContext context) => _HowScope(state: this, page: _page, child: widget.child);
}

/// The steps' state, for the parts of the sheet.
class _HowScope extends InheritedWidget {
  const _HowScope({required this.state, required this.page, required super.child});

  final _HowCaptureWorksState state;

  /// The page in view.
  final int page;

  static _HowCaptureWorksState of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_HowScope>()!.state;

  // The measured heights live in the state too: any rebuild of it may change what the parts draw.
  @override
  bool updateShouldNotify(_HowScope old) => true;
}

/// The pages, one step each, swiped sideways.
class _HowPages extends StatelessWidget {
  const _HowPages();

  @override
  Widget build(BuildContext context) {
    final how = _HowScope.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: WambitoTokens.space3),
      child: AnimatedBuilder(
        animation: how._controller,
        builder: (context, child) => SizedBox(height: how._height(), child: child),
        child: PageView.builder(
          controller: how._controller,
          itemCount: CaptureHowStep.values.length,
          onPageChanged: how._turned,
          itemBuilder: (context, page) => OverflowBox(
            alignment: Alignment.topCenter,
            minHeight: 0,
            maxHeight: double.infinity,
            child: _MeasureHeight(
              onHeight: (height) => how._measured(page, height),
              child: CaptureHowStepView(step: CaptureHowStep.values[page]),
            ),
          ),
        ),
      ),
    );
  }
}

/// The sheet's stuck footer: the dots, then Siguiente; on the last step the disclosure and the
/// button that ends ("Activar acceso" or "Entendido").
class _HowFooter extends StatelessWidget {
  const _HowFooter();

  @override
  Widget build(BuildContext context) {
    final how = _HowScope.of(context);
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    final page = how._page;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: WambitoTokens.space2,
      children: [
        _Dots(count: CaptureHowStep.values.length, current: page, onTap: how._go),
        if (page < _HowCaptureWorksState._last)
          PressButton.text(
            l10n.autoCaptureHowNext,
            key: const Key('autoCapture.how.next'),
            onPressed: () => how._go(page + 1),
          )
        else ...[
          CssParagraph(
            l10n.autoCaptureHowDisclosure,
            key: const Key('autoCapture.how.disclosure'),
            style: LkText.body.copyWith(color: colors.ink),
          ),
          if (how.widget.askAccess)
            PressButton.text(
              l10n.autoCaptureExplainerConfirm,
              key: const Key('autoCapture.explainer.confirm'),
              onPressed: () => Navigator.of(context).pop(true),
            )
          else
            PressButton.text(
              l10n.autoCaptureHowDone,
              key: const Key('autoCapture.how.done'),
              onPressed: () => Navigator.of(context).pop(false),
            ),
        ],
      ],
    );
  }
}

/// One step: its scene (decoration), title, body and, for most, its demo.
class CaptureHowStepView extends StatelessWidget {
  const CaptureHowStepView({super.key, required this.step});

  final CaptureHowStep step;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    final (title, body) = switch (step) {
      CaptureHowStep.pay => (l10n.autoCaptureHowPayTitle, l10n.autoCaptureHowPayBody),
      CaptureHowStep.reads => (l10n.autoCaptureHowReadsTitle, l10n.autoCaptureHowReadsBody),
      CaptureHowStep.decide => (l10n.autoCaptureHowDecideTitle, l10n.autoCaptureHowDecideBody),
      CaptureHowStep.learns => (l10n.autoCaptureHowLearnsTitle, l10n.autoCaptureHowLearnsBody),
      CaptureHowStep.next => (l10n.autoCaptureHowNextTitle, l10n.autoCaptureHowNextBody),
    };
    final demo = switch (step) {
      CaptureHowStep.pay => const MainPicture(),
      CaptureHowStep.reads => const ChipsDemo(),
      CaptureHowStep.decide => const NoticeDemo(),
      CaptureHowStep.learns => const LearnDemo(),
      CaptureHowStep.next => null,
    };
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: WambitoTokens.space2,
      children: [
        Center(
          child: Image.asset(
            'assets/wambi/capture-step${step.index + 1}.webp',
            width: 200,
            height: 200,
            fit: BoxFit.contain,
            excludeFromSemantics: true,
          ),
        ),
        Semantics(
          header: true,
          child: Text(
            title,
            style: LkText.title.copyWith(fontSize: 22, height: 1.2, color: colors.ink),
          ),
        ),
        Text(body, style: LkText.body.copyWith(height: 1.45, color: colors.inkMuted)),
        ?demo,
      ],
    );
  }
}

/// The dots under the pages: the step in view is a wider pill in the brand's color; each dot is a
/// 44px target that goes to its step.
class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.current, required this.onTap});

  final int count;
  final int current;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.lkColors;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          Semantics(
            key: Key('autoCapture.how.dot.$i'),
            button: true,
            selected: i == current,
            label: AppLocalizations.of(context).autoCaptureHowStepOf(i + 1, count),
            excludeSemantics: true,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onTap(i),
              child: SizedBox(
                width: 32,
                height: 44,
                child: Center(
                  child: Container(
                    width: i == current ? 20 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == current ? colors.brand : colors.stroke,
                      borderRadius: LkSurface.radius(LkRadius.pill),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Tells [onHeight] its child's height after each layout that changes it (after the frame: a
/// height is state of the page view above, which cannot change during layout).
class _MeasureHeight extends SingleChildRenderObjectWidget {
  const _MeasureHeight({required this.onHeight, required super.child});

  final ValueChanged<double> onHeight;

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderMeasureHeight(onHeight);

  @override
  void updateRenderObject(BuildContext context, _RenderMeasureHeight renderObject) {
    renderObject.onHeight = onHeight;
  }
}

class _RenderMeasureHeight extends RenderProxyBox {
  _RenderMeasureHeight(this.onHeight);

  ValueChanged<double> onHeight;
  double? _reported;

  @override
  void performLayout() {
    super.performLayout();
    final height = size.height;
    if (height == _reported) return;
    _reported = height;
    WidgetsBinding.instance.addPostFrameCallback((_) => onHeight(height));
  }
}
