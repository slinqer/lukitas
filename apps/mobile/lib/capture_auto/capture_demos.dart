// The demos of automatic capture's "¿Cómo funciona?" (spec sections 3 and 4): the web's
// apps/web/app/features/capture/CaptureDemos.tsx and the CSS it uses (capture.css `.lk-capture-*`,
// app.css `.lk-tile`, `.lk-amount`). Decoration built from the app's pieces: every color is a token,
// nothing moves, and the step's title and body are what assistive technology reads.
import 'package:flutter/material.dart';

import '../capture/preview/capture_card.dart';
import '../l10n/app_localizations.dart';
import '../money/format.dart';
import '../theme/surfaces.dart';
import '../theme/text_styles.dart';
import '../theme/tokens.g.dart';
import '../ui/lk_theme.dart';
import '../ui/svg_path.dart';

/// Invented sample figures for the demos (cents, euros).
abstract final class _Demo {
  static const expense = -1250;
  static const income = 120000;
  static const merchant = 'Pastelaria Aurora';
  static const payroll = 'Nómina';
  static const bank = 'Revolut';
  static const time = '17:06';
  static const currency = 'EUR';
}

const _check = 'm5.5 12.5 4 4 9-9';
const _arrowDown = 'M12 5v14M6 13l6 6 6-6';

/// The text the demos are written in (the body's Nunito 700), at [size] and [weight].
TextStyle _text(double size, FontWeight weight, Color color) =>
    LkText.body.copyWith(fontSize: size, fontWeight: weight, color: color);

/// [cents] as money: negative amounts carry their minus; a plus only with [plus] (the web's
/// `money(cents)` against `money(cents, plus(cents))`).
String _money(BuildContext context, int cents, {bool plus = false}) => formatMoney(
  cents,
  _Demo.currency,
  Localizations.localeOf(context).languageCode,
  sign: plus ? MoneySign.always : MoneySign.auto,
);

/// A movement's amount: income gets its plus, an expense its minus.
String _signed(BuildContext context, int cents) => _money(context, cents, plus: cents > 0);

/// `.lk-capture-demo`: the sunken box every demo sits in, hidden from assistive technology.
class _DemoBox extends StatelessWidget {
  const _DemoBox({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Container(
      padding: const EdgeInsets.all(WambitoTokens.space4),
      decoration: BoxDecoration(
        color: context.lkColors.bg,
        borderRadius: LkSurface.radius(LkRadius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: WambitoTokens.space3,
        children: children,
      ),
    ),
  );
}

/// An inline SVG icon of the web (a 24 × 24 view box, stroked with round ends).
class _StrokeIcon extends StatelessWidget {
  const _StrokeIcon(this.path, {required this.size, required this.width, required this.color});

  final String path;
  final double size;
  final double width;
  final Color color;

  @override
  Widget build(BuildContext context) =>
      CustomPaint(size: Size.square(size), painter: _StrokePainter(path, width, color));
}

class _StrokePainter extends CustomPainter {
  _StrokePainter(this.path, this.width, this.color);

  final String path;
  final double width;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    canvas.scale(scale);
    canvas.drawPath(
      parseSvgPath(path),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_StrokePainter old) =>
      old.path != path || old.width != width || old.color != color;
}

/// `.lk-capture-notif`: a notification as Android shows it, a dark card in both themes.
class _Notification extends StatelessWidget {
  const _Notification({required this.icon, required this.app, this.title, required this.line})
    : actions = const [];

  const _Notification.withActions({
    required this.icon,
    required this.app,
    required this.line,
    required this.actions,
  }) : title = null;

  final String icon;
  final String app;
  final String? title;
  final String line;
  final List<String> actions;

  @override
  Widget build(BuildContext context) {
    final colors = context.lkColors;
    final on = colors.onBrand;
    final title = this.title;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: WambitoTokens.space4,
        vertical: WambitoTokens.space3,
      ),
      decoration: BoxDecoration(
        color: colors.brandPlum,
        borderRadius: LkSurface.radius(LkRadius.lg),
      ),
      child: Row(
        spacing: WambitoTokens.space3,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: on, borderRadius: LkSurface.radius(LkRadius.sm)),
            child: Text(icon, style: _text(18, FontWeight.w900, colors.brandPlum)),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 2,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(app, style: _text(12, FontWeight.w800, on))),
                    Text(_Demo.time, style: _text(12, FontWeight.w800, on)),
                  ],
                ),
                if (title != null) Text(title, style: _text(15, FontWeight.w900, on)),
                Text(line, style: _text(14, FontWeight.w700, on)),
                if (actions.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: WambitoTokens.space2),
                    child: Row(
                      spacing: WambitoTokens.space2,
                      children: [
                        for (final action in actions)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              borderRadius: LkSurface.radius(LkRadius.pill),
                              border: Border.all(color: on, width: 2),
                            ),
                            // Android writes a notification's actions in upper case.
                            child: Text(
                              LkText.upperCase(action),
                              style: _text(13, FontWeight.w900, on),
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// `.lk-capture-row`: a movement at a glance (tile, name, category line, amount).
class _Row extends StatelessWidget {
  const _Row({
    required this.glyph,
    required this.name,
    required this.cents,
    required this.category,
    this.review = false,
    this.checked = false,
  });

  final String glyph;
  final String name;
  final int cents;
  final String category;

  /// "· por revisar" after the category.
  final bool review;

  /// The round check before the amount: the category came by itself.
  final bool checked;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    final sub = _text(12, FontWeight.w700, colors.inkMuted);
    return Row(
      spacing: WambitoTokens.space3,
      children: [
        CaptureTile(glyph: glyph),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 2,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: _text(14, FontWeight.w800, colors.ink),
              ),
              Text.rich(
                TextSpan(
                  style: sub,
                  children: [
                    TextSpan(text: review ? '$category · ' : category),
                    if (review)
                      TextSpan(
                        text: l10n.autoCaptureHowReview,
                        style: sub.copyWith(color: colors.near, fontWeight: FontWeight.w900),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (checked)
          Container(
            width: 22,
            height: 22,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: colors.good, shape: BoxShape.circle),
            child: _StrokeIcon(_check, size: 14, width: 3, color: colors.bg),
          ),
        Text(
          _signed(context, cents),
          softWrap: false,
          style: LkText.amount.copyWith(color: cents < 0 ? colors.over : colors.good),
        ),
      ],
    );
  }
}

/// A bank notification, the arrow, and the movement it became ("✓ Anotado en Wambito").
class _Pair extends StatelessWidget {
  const _Pair({required this.title, required this.cents, required this.category});

  final String title;
  final int cents;
  final String category;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: WambitoTokens.space3,
      children: [
        _Notification(
          icon: 'R',
          app: _Demo.bank,
          title: title,
          line: '💳 ${_signed(context, cents)}',
        ),
        Center(
          child: Container(
            width: 32,
            height: 32,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: colors.surface,
              shape: BoxShape.circle,
              border: Border.all(color: colors.stroke, width: 2),
            ),
            child: _StrokeIcon(_arrowDown, size: 18, width: 2.4, color: colors.brand),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(WambitoTokens.space3),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: LkSurface.radius(LkRadius.lg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: WambitoTokens.space2,
            children: [
              Row(
                spacing: WambitoTokens.space2,
                children: [
                  _StrokeIcon(_check, size: 18, width: 2.6, color: colors.good),
                  Flexible(
                    child: Text(
                      l10n.autoCaptureHowRegistered,
                      style: LkText.title.copyWith(fontSize: 16, height: 1.5, color: colors.good),
                    ),
                  ),
                ],
              ),
              _Row(
                glyph: cents < 0 ? '🛍️' : '💼',
                name: title,
                cents: cents,
                category: category,
                review: true,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Step 1: the bank's notification becomes a movement marked "por revisar". With [income] the
/// payroll pair follows the expense (hidden until income notifications are read).
class MainPicture extends StatelessWidget {
  const MainPicture({super.key, this.income = false});

  final bool income;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _DemoBox(
      children: [
        _Pair(
          title: _Demo.merchant,
          cents: _Demo.expense,
          category: l10n.autoCaptureHowOtherExpenses,
        ),
        if (income)
          _Pair(
            title: _Demo.payroll,
            cents: _Demo.income,
            category: l10n.autoCaptureHowOtherIncome,
          ),
      ],
    );
  }
}

/// Step 2: only these four things leave the phone.
class ChipsDemo extends StatelessWidget {
  const ChipsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    final style = _text(
      14,
      FontWeight.w800,
      colors.ink,
    ).copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
    return _DemoBox(
      children: [
        Wrap(
          spacing: WambitoTokens.space2,
          runSpacing: WambitoTokens.space2,
          children: [
            for (final chip in [
              _money(context, -_Demo.expense),
              _Demo.merchant,
              l10n.autoCaptureHowToday,
              _Demo.bank,
            ])
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: LkSurface.radius(LkRadius.pill),
                  border: Border.all(color: colors.stroke, width: 2),
                ),
                child: Text(chip, style: style),
              ),
          ],
        ),
      ],
    );
  }
}

/// Step 3: Wambito's own notification, with its two buttons.
class NoticeDemo extends StatelessWidget {
  const NoticeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _DemoBox(
      children: [
        _Notification.withActions(
          icon: 'W',
          app: 'Wambito',
          line: l10n.autoCaptureHowNotice(
            _money(context, _Demo.expense),
            _Demo.merchant,
            l10n.autoCaptureHowOtherExpenses,
          ),
          actions: [l10n.autoCaptureHowOk, l10n.autoCaptureHowChange],
        ),
      ],
    );
  }
}

/// Step 4: the second time at the same merchant, the category is already there.
class LearnDemo extends StatelessWidget {
  const LearnDemo({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return _DemoBox(
      children: [
        _Row(
          glyph: '🛍️',
          name: _Demo.merchant,
          cents: _Demo.expense,
          category: l10n.autoCaptureHowOtherExpenses,
          review: true,
        ),
        _Row(
          glyph: '🍽️',
          name: _Demo.merchant,
          cents: _Demo.expense,
          category: l10n.autoCaptureHowEatingOut,
          checked: true,
        ),
      ],
    );
  }
}
