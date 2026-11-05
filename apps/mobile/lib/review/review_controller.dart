import 'dart:async';

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

  /// Confirms [ids] (all or nothing). Throws the failure and keeps the list when it does not work;
  /// otherwise they leave the list and home catches up.
  Future<void> confirm(List<String> ids) async {
    await ref.read(reviewRepositoryProvider).confirm(ids);
    final left = state.value?.where((t) => !ids.contains(t.id)).toList();
    if (left != null) state = AsyncData(left);
    unawaited(ref.read(homeProvider.notifier).refresh());
  }
}

final reviewProvider = AsyncNotifierProvider<ReviewList, List<Transaction>>(ReviewList.new);
