import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/gen/wambito_api.dart';
import '../api/session.dart';
import '../home/home_repository.dart';

/// Rows asked of the API for the inbox. More than a person reviews in one sitting.
const reviewPageSize = 100;

/// What the review inbox reads and changes on the server. Every failure is a [HomeFailure].
abstract interface class ReviewRepository {
  /// The transactions detected from notifications that wait for a look, newest first.
  Future<List<Transaction>> pending();

  /// Confirms [ids] at once (all or nothing); the server learns each merchant's category.
  Future<void> confirm(List<String> ids);
}

/// [ReviewRepository] over the generated client.
class ApiReviewRepository implements ReviewRepository {
  ApiReviewRepository(this._api);

  final DefaultApi _api;

  @override
  Future<List<Transaction>> pending() async {
    try {
      final data = (await _api.listTransactions(needsReview: 'true', limit: reviewPageSize)).data;
      if (data == null) throw const HomeFailure(500);
      return data.items.toList();
    } on DioException catch (error) {
      throw HomeFailure.fromDio(error);
    }
  }

  @override
  Future<void> confirm(List<String> ids) async {
    try {
      await _api.reviewTransactions(
        reviewTransactions: ReviewTransactions((b) => b..ids.replace(ids)),
      );
    } on DioException catch (error) {
      throw HomeFailure.fromDio(error);
    }
  }
}

final reviewRepositoryProvider = Provider<ReviewRepository>(
  (ref) => ApiReviewRepository(ref.watch(apiClientProvider).api.getDefaultApi()),
);
