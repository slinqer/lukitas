import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../theme/text_styles.dart';
import '../theme/tokens.g.dart';
import '../ui/css_text.dart';
import '../ui/lk_theme.dart';
import '../ui/press_button.dart';
import '../ui/sheet.dart';

/// The explanation shown the first time a source is switched on (spec section 2.1; also the
/// prominent disclosure Google Play asks for before notification access): which apps are read,
/// that the text stays on the phone, what reaches the server. Answers true when the person goes on.
Future<bool> showAutoCaptureExplainer(BuildContext context) async {
  final l10n = AppLocalizations.of(context);
  final colors = context.lkColors;
  final go = await LkSheet.show<bool>(
    context,
    title: l10n.autoCaptureTitle,
    children: [
      Padding(
        padding: const EdgeInsets.only(top: WambitoTokens.space3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: WambitoTokens.space4,
          children: [
            CssParagraph(
              l10n.autoCaptureExplainerBody,
              style: LkText.body.copyWith(color: colors.ink),
            ),
            Builder(
              builder: (sheet) => PressButton.text(
                l10n.autoCaptureExplainerConfirm,
                key: const Key('autoCapture.explainer.confirm'),
                onPressed: () => Navigator.of(sheet).pop(true),
              ),
            ),
          ],
        ),
      ),
    ],
  );
  return go ?? false;
}
