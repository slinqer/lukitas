import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../theme/surfaces.dart';
import '../theme/text_styles.dart';
import '../theme/tokens.g.dart';
import '../ui/lk_theme.dart';
import '../ui/pressable.dart';
import 'review_controller.dart';

/// Home's "3 gastos por revisar": there only while detected movements wait, and it opens the inbox.
class ReviewHomeRow extends ConsumerWidget {
  const ReviewHomeRow({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(reviewProvider.select((s) => s.value?.length ?? 0));
    if (count == 0) return const SizedBox.shrink();
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    final label = l10n.homeReviewCount(count);
    return Pressable(
      key: const Key('home.review'),
      label: label,
      onPressed: () => context.push('/review'),
      builder: (context, state) => DecoratedBox(
        decoration: BoxDecoration(
          color: colors.surfaceRow,
          borderRadius: LkSurface.radius(LkRadius.lg),
          border: Border.all(color: colors.near, width: 2),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: WambitoTokens.space3,
            vertical: WambitoTokens.space3,
          ),
          child: Row(
            spacing: WambitoTokens.space2,
            children: [
              Expanded(
                child: ExcludeSemantics(
                  child: Text(label, style: LkText.label.copyWith(color: colors.ink)),
                ),
              ),
              ExcludeSemantics(
                child: Text('›', style: LkText.label.copyWith(color: colors.inkMuted)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
