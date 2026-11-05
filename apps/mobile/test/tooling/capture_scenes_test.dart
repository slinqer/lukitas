import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The five "¿Cómo funciona?" scenes: the same files on the web (/wambi/) and in the app's assets,
/// each a 512 px VP8X WebP with alpha.
void main() {
  final pubspec = File('pubspec.yaml').readAsStringSync();

  for (var n = 1; n <= 5; n++) {
    test('capture-step$n is byte-identical to the web copy', () {
      final mobile = File('assets/wambi/capture-step$n.webp').readAsBytesSync();
      final web = File('../web/public/wambi/capture-step$n.webp').readAsBytesSync();
      expect(mobile, equals(web));
    });

    test('capture-step$n is a VP8X WebP with alpha, 512 px wide', () {
      final bytes = File('assets/wambi/capture-step$n.webp').readAsBytesSync();
      expect(String.fromCharCodes(bytes.sublist(0, 4)), 'RIFF');
      expect(String.fromCharCodes(bytes.sublist(8, 16)), 'WEBPVP8X');
      expect(bytes[20] & 0x10, isNot(0), reason: 'the alpha flag');
      final width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      expect(width, 512);
    });

    test('pubspec declares capture-step$n', () {
      expect(pubspec, contains('assets/wambi/capture-step$n.webp'));
    });
  }
}
