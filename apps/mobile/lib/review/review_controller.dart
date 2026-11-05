import 'dart:async';
import 'dart:math' show min;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/gen/wambito_api.dart';
import '../home/home_controller.dart';
import 'review_repository.dart';

/// The detected transactions waiting for a look: home's "N gastos por revisar" counts them and the
/// inbox lists them. Read when first watched; read again by `ref.invalidate(reviewProvider)` (home
/// does it on pull-to-refresh and on return to the app), and what the person confirms leaves at once.
class ReviewList extends AsyncNotifier<List<Transaction>> {
  @override
  Future<List<Transaction>> build() => ref.watch(reviewRepositoryProvider).pending();

  /// Confirms [ids], [reviewBatchSize] per request (the server's limit; each request is all or
  /// nothing). Each batch that works leaves the list at once; the first failure is thrown and the
  /// rest stay. Home catches up either way.
  Future<void> confirm(List<String> ids) async {
    final repository = ref.read(reviewRepositoryProvider);
    try {
      for (var start = 0; start < ids.length; start += reviewBatchSize) {
        final batch = ids.sublist(start, min(start + reviewBatchSize, ids.length)).toSet();
        await repository.confirm(batch.toList());
        final left = state.value?.where((t) => !batch.contains(t.id)).toList();
        if (left != null) state = AsyncData(left);
      }
    } finally {
      unawaited(ref.read(homeProvider.notifier).refresh());
    }
  }
}

final reviewProvider = AsyncNotifierProvider<ReviewList, List<Transaction>>(ReviewList.new);
