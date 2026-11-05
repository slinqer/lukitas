import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../add/add_sheet.dart';
import '../api/gen/wambito_api.dart';
import '../capture/capture_sheet.dart';
import '../home/category_look.dart';
import '../home/home_controller.dart';
import '../home/home_repository.dart';
import '../home/home_widgets.dart' show QuietSpinner;
import '../home/screen_error.dart';
import '../home/shell_navigation.dart';
import '../home/wambi_face.dart';
import '../l10n/app_localizations.dart';
import '../theme/text_styles.dart';
import '../theme/tokens.g.dart';
import '../ui/lk_theme.dart';
import '../ui/manage_page.dart';
import '../ui/page_header.dart';
import '../ui/press_button.dart';
import '../ui/toast.dart';
import '../ui/transaction_row.dart';
import '../ui/wambi_bubble.dart';
import 'review_controller.dart';
import 'review_mark.dart';

/// `/review` (and `/review/<id>`, which also opens that movement in the editor): the movements the
/// phone detected from bank notifications, waiting for a look. Bien confirms one, Cambiar edits it
/// (saving confirms it), Confirmar todos confirms every one.
class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, this.openId});

  /// The movement to open in the editor once the list is there.
  final String? openId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  var _opened = false;
  var _busy = false;

  void _back() {
    final router = GoRouter.of(context);
    if (router.canPop()) {
      router.pop();
    } else {
      router.go('/');
    }
  }

  void _openRequested(List<Transaction> items) {
    final id = widget.openId;
    if (_opened || id == null) return;
    _opened = true;
    final tx = items.where((t) => t.id == id).firstOrNull;
    if (tx == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) unawaited(openEditSheet(context, tx));
    });
  }

  Future<void> _confirm(List<String> ids) async {
    if (_busy) return;
    final toasts = ToastHost.of(context);
    final l10n = AppLocalizations.of(context);
    setState(() => _busy = true);
    try {
      await ref.read(reviewProvider.notifier).confirm(ids);
    } on HomeFailure catch (failure) {
      toasts.say(failure.offline ? l10n.errorNetwork : l10n.errorGeneric, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final colors = context.lkColors;
    final list = ref.watch(reviewProvider);
    final home = ref.watch(homeProvider);
    final data = home.data;
    final items = list.value;
    if (items != null) _openRequested(items);

    Widget body;
    if (items == null && list.hasError || data == null && home.failure != null) {
      final failure = list.error is HomeFailure ? list.error as HomeFailure : home.failure;
      body = ScreenError(
        message: (failure?.offline ?? false) ? l10n.errorNetwork : l10n.errorGeneric,
        retryLabel: l10n.retry,
        onRetry: () {
          ref.invalidate(reviewProvider);
          unawaited(ref.read(homeProvider.notifier).refresh());
        },
      );
    } else if (items == null || data == null) {
      body = const Center(child: QuietSpinner(size: 28));
    } else if (items.isEmpty) {
      body = WambiBubble(message: l10n.reviewEmpty, mood: WambiMood.happy);
    } else {
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: WambitoTokens.space3,
        children: [
          if (items.length > 1)
            PressButton.text(
              l10n.reviewConfirmAll,
              key: const Key('review.confirmAll'),
              onPressed: _busy ? null : () => unawaited(_confirm([for (final t in items) t.id])),
            ),
          for (final tx in items) _item(l10n, data, tx),
        ],
      );
    }

    return ManagePage(
      key: const Key('review.page'),
      current: 'review',
      onAdd: () => unawaited(openAddSheet(context)),
      onMic: () => unawaited(openCapture(context, listen: true)),
      onNavigate: (to) => navigateFromShell(context, ref, to, current: 'review'),
      header: PageHeader(
        backLabel: l10n.manageBack,
        backShort: l10n.manageBackShort,
        onBack: _back,
      ),
      children: [
        Semantics(
          header: true,
          child: Text(l10n.reviewTitle, style: LkText.pageTitle.copyWith(color: colors.ink)),
        ),
        body,
      ],
    );
  }

  Widget _item(AppLocalizations l10n, HomeData data, Transaction tx) {
    final category = data.categories[tx.categoryId];
    return Column(
      key: ValueKey(tx.id),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: WambitoTokens.space2,
      children: [
        TransactionRow(
          name: tx.name,
          categoryName: category?.name ?? '',
          glyph: category == null
              ? '🏷️'
              : categoryLook(icon: category.icon, color: category.color).glyph,
          amount: tx.amount,
          currency: data.currency,
          status: tx.status == TransactionStatusEnum.pending
              ? TransactionRowStatus.pending
              : TransactionRowStatus.paid,
          reviewMark: reviewMarkOf(l10n, tx),
          onOpen: () => unawaited(openEditSheet(context, tx)),
        ),
        Row(
          spacing: WambitoTokens.space2,
          children: [
            Expanded(
              child: PressButton.text(
                l10n.reviewOk,
                key: Key('review.ok.${tx.id}'),
                size: PressSize.sm,
                onPressed: _busy ? null : () => unawaited(_confirm([tx.id])),
              ),
            ),
            Expanded(
              child: PressButton.text(
                l10n.reviewChange,
                key: Key('review.change.${tx.id}'),
                tone: PressTone.secondary,
                size: PressSize.sm,
                onPressed: () => unawaited(openEditSheet(context, tx)),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
