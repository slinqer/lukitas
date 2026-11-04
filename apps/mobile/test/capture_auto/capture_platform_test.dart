import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/capture_auto/capture_platform.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('wambito/capture');
  final calls = <MethodCall>[];
  Object? Function(MethodCall call)? answer;

  setUp(() {
    calls.clear();
    answer = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async {
        calls.add(call);
        return answer?.call(call);
      },
    );
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      null,
    );
  });

  test('the status is read as Android says it', () async {
    const platform = ChannelAutoCapturePlatform();
    answer = (_) => {
      'access': 'granted',
      'sources': ['revolut'],
    };
    final status = await platform.status();
    expect(status?.access, isTrue);
    expect(status?.sources, {'revolut'});

    answer = (_) => {'access': 'missing', 'sources': <String>[]};
    final missing = await platform.status();
    expect(missing?.access, isFalse);
    expect(missing?.anyOn, isFalse);
  });

  test('switching a source, opening the screens and clearing the queue go by name', () async {
    const platform = ChannelAutoCapturePlatform();
    answer = (call) => call.method.startsWith('open') ? true : null;
    await platform.setSource('google_wallet', true);
    expect(await platform.openAccessSettings(), isTrue);
    expect(await platform.openAppInfo(), isTrue);
    await platform.clearQueue();

    expect(calls.map((c) => c.method), [
      'setSource',
      'openAccessSettings',
      'openAppInfo',
      'clearQueue',
    ]);
    expect(calls.first.arguments, {'source': 'google_wallet', 'enabled': true});
  });

  test('without an Android side the status is null and nothing throws', () async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      null,
    );
    const platform = ChannelAutoCapturePlatform();
    expect(await platform.status(), isNull);
    expect(await platform.openAccessSettings(), isFalse);
    await platform.clearQueue();
  });
}
