import 'dart:async';
import 'dart:math' show min;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/gen/wambito_api.dart';
import '../capture_auto/capture_platform.dart';
import '../home/home_controller.dart';
import 'review_repository.dart';

/// The detected transactions waiting for a look: home's "N gastos por revisar" counts them and the
/// inbox lists them. Read when first watched; read again by `ref.invalidate(reviewProvider)` (home
/// does it on pull-to-refresh and on return to the app), and what the person confirms leaves at once.
/// The phone's capture notifications follow: each read keeps only those of what still waits, and a
/// confirm takes its own away.
class ReviewList extends AsyncNotifier<List<Transaction>> {
  @override
  Future<List<Transaction>> build() async {
    final repository = ref.watch(reviewRepositoryProvider);
    final platform = ref.read(autoCapturePlatformProvider);
    final before = DateTime.now();
    final pending = await repository.pending();
    // A full page may leave older ones out: then no notification is taken away.
    if (pending.length < reviewPageSize) {
      unawaited(platform.keepOnlyNotifications([for (final t in pending) t.id], before));
    }
    return pending;
  }

  /// Confirms [ids], [reviewBatchSize] per request (the server's limit; each request is all or
  /// nothing). Each batch that works leaves the list at once; the first failure is thrown and the
  /// rest stay. Home catches up either way.
  Future<void> confirm(List<String> ids) async {
    final repository = ref.read(reviewRepositoryProvider);
    final platform = ref.read(autoCapturePlatformProvider);
    try {
      for (var start = 0; start < ids.length; start += reviewBatchSize) {
        final batch = ids.sublist(start, min(start + reviewBatchSize, ids.length)).toSet();
        await repository.confirm(batch.toList());
        unawaited(platform.dismissNotifications(batch.toList()));
        final left = state.value?.where((t) => !batch.contains(t.id)).toList();
        if (left != null) state = AsyncData(left);
      }
    } finally {
      unawaited(ref.read(homeProvider.notifier).refresh());
    }
  }
}

final reviewProvider = AsyncNotifierProvider<ReviewList, List<Transaction>>(ReviewList.new);
