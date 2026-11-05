import '../api/gen/wambito_api.dart';
import '../l10n/app_localizations.dart';

/// "por revisar · de Revolut" for a movement detected from a notification and not confirmed yet;
/// null for any other.
String? reviewMarkOf(AppLocalizations l10n, Transaction tx) {
  if (!tx.needsReview) return null;
  final source = switch (tx.captureSource) {
    TransactionCaptureSourceEnum.revolut => 'revolut',
    TransactionCaptureSourceEnum.googleWallet => 'google_wallet',
    _ => '',
  };
  return l10n.reviewMark(source);
}
