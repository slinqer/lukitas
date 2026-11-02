import 'dart:convert';
import 'dart:io';

import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/theme/tokens.g.dart';

import '../../scripts/gen-tokens.dart' show generateTokensDart, tokensJsonPath;

void main() {
  test('tokens.g.dart is up to date with tokens.json', () {
    final tokens = jsonDecode(File(tokensJsonPath).readAsStringSync()) as Map<String, dynamic>;
    final committed = File('lib/theme/tokens.g.dart').readAsStringSync();

    expect(
      generateTokensDart(tokens),
      committed,
      reason: 'Run `dart run scripts/gen-tokens.dart` and commit lib/theme/tokens.g.dart.',
    );
  });

  test('the tokens carry the design system values', () {
    expect(WambitoTokens.night.bg, const Color(0xFF15122B));
    expect(WambitoTokens.day.bg, const Color(0xFFF7F4FF));
    expect(WambitoTokens.night.brand, const Color(0xFF7C4DFF));
    // rgba(6, 4, 20, 0.78): alpha 0.78 × 255 rounds to 199.
    expect(WambitoTokens.night.wambiShadow, const Color(0xC7060414));
    expect(WambitoTokens.space4, 16.0);
    expect(WambitoTokens.radiusPill, 999.0);
    expect(WambitoTokens.durationPress, const Duration(milliseconds: 80));
    expect(WambitoTokens.durationUndo, const Duration(seconds: 8));
  });
}
