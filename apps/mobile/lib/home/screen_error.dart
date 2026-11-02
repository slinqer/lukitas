// The web's ScreenError (apps/web/app/features/home/ScreenError.tsx).
import 'package:flutter/material.dart';

import '../theme/text_styles.dart';
import '../theme/tokens.g.dart';
import '../ui/lk_theme.dart';
import '../ui/press_button.dart';
import 'wambi_face.dart';

/// What the screen shows when its first load fails (the web's `ScreenError`): Wambi worried,
/// what went wrong, and a retry.
class ScreenError extends StatelessWidget {
  const ScreenError({
    super.key,
    required this.message,
    required this.retryLabel,
    required this.onRetry,
  });

  final String message;
  final String retryLabel;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = context.lkColors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(WambitoTokens.space4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: WambitoTokens.space4,
          children: [
            const WambiFace(mood: WambiMood.worried, size: 96),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  message,
                  textAlign: TextAlign.center,
                  style: LkText.body.copyWith(fontSize: 16, color: colors.ink),
                ),
              ),
            ),
            PressButton.text(retryLabel, onPressed: onRetry),
          ],
        ),
      ),
    );
  }
}
