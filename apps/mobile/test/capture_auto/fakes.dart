import 'package:wambito/capture_auto/capture_platform.dart';

/// Android's side of automatic capture in memory.
class FakeAutoCapturePlatform implements AutoCapturePlatform {
  FakeAutoCapturePlatform({this.access = false, Set<String>? sources, this.available = true})
    : sources = sources ?? {};

  /// Whether the notification access is granted.
  bool access;
  final Set<String> sources;

  /// False: no Android side (the status is null).
  bool available;

  /// Every call, in order: `setSource revolut true`, `openAccessSettings`, ...
  final calls = <String>[];

  List<String> callsNamed(String name) => calls.where((c) => c.split(' ').first == name).toList();

  @override
  Future<AutoCaptureStatus?> status() async {
    calls.add('status');
    return available ? AutoCaptureStatus(access: access, sources: {...sources}) : null;
  }

  @override
  Future<void> setSource(String source, bool enabled) async {
    calls.add('setSource $source $enabled');
    if (enabled) {
      sources.add(source);
    } else {
      sources.remove(source);
    }
  }

  @override
  Future<bool> openAccessSettings() async {
    calls.add('openAccessSettings');
    return true;
  }

  @override
  Future<bool> openAppInfo() async {
    calls.add('openAppInfo');
    return true;
  }

  @override
  Future<void> clearQueue() async => calls.add('clearQueue');
}
