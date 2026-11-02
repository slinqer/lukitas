import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

/// How Wambi feels about the month (the web's `moodFor`): celebrating right after a save or a
/// payment, worried while any category is near or over its limit, happy otherwise.
enum WambiMood {
  happy('assets/wambi/wave.webp', Duration(milliseconds: 1200), 2, 0),
  worried('assets/wambi/worried.webp', Duration(milliseconds: 2000), 1, 3),
  celebrating('assets/wambi/celebrate.webp', Duration(milliseconds: 1000), 2, 4);

  const WambiMood(this.sheet, this.loop, this.loops, this.stillFrame);

  /// The web's own sprite sheet: 4x2 frames of 500 px.
  final String sheet;

  /// One pass over the eight frames: the web's `WambiSprite.loopMs` (wave 1200, worried 2000,
  /// celebrate 1000 in apps/web/app/wambi/Wambi.tsx).
  final Duration loop;

  /// How many passes it plays before it rests on the first frame.
  final int loops;

  /// The frame shown under "remove animations" (0-based, in reading order), as the web's
  /// `WAMBI_ART[mood].stillFrame` (apps/web/app/wambi/Wambi.tsx): happy the first, a soft smile;
  /// worried frame 3, hands clasped and a sweat drop; celebrating frame 4, fists up among sparkles.
  final int stillFrame;
}

/// Wambi's face for a [mood], from the web's sprite sheets. It plays its loop a couple of times
/// when the mood arrives, then rests on the first frame; with the system's "remove animations" it
/// stands still on the mood's [WambiMood.stillFrame].
class WambiFace extends StatefulWidget {
  const WambiFace({
    super.key,
    required this.mood,
    this.size = 72,
    this.decorative = false,
    this.label,
    this.endless = false,
  });

  final WambiMood mood;
  final double size;

  /// Hidden from assistive technology, when something next to Wambi already says the same (the
  /// web's `decorative`).
  final bool decorative;

  /// How he is named for assistive technology (the web's `mascot.<mood>`); "Wambi" when null.
  final String? label;

  /// Plays the loop for as long as he is on screen, as the web's does (the celebration's Wambi
  /// is there for one stay), instead of a couple of passes.
  final bool endless;

  @override
  State<WambiFace> createState() => _WambiFaceState();
}

class _WambiFaceState extends State<WambiFace> with SingleTickerProviderStateMixin {
  static const _columns = 4;
  static const _rows = 2;
  static const _frames = _columns * _rows;

  late final AnimationController _controller = AnimationController(vsync: this);
  bool _animate = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final animate = !MediaQuery.disableAnimationsOf(context);
    if (animate != _animate || !_controller.isAnimating && _controller.value == 0) {
      _animate = animate;
      _play();
    }
  }

  @override
  void didUpdateWidget(WambiFace old) {
    super.didUpdateWidget(old);
    if (old.mood != widget.mood) _play();
  }

  void _play() {
    _controller
      ..stop()
      ..value = 0
      ..duration = widget.mood.loop;
    if (_animate) _controller.repeat(count: widget.endless ? null : widget.mood.loops);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    final picture = SizedBox.square(
      dimension: size,
      child: ClipRect(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final frame = _animate
                ? (_controller.value * _frames).floor() % _frames
                : widget.mood.stillFrame;
            final column = frame % _columns;
            final row = frame ~/ _columns;
            return OverflowBox(
              maxWidth: size * _columns,
              maxHeight: size * _rows,
              alignment: Alignment(-1 + 2 * column / (_columns - 1), -1 + 2 * row / (_rows - 1)),
              child: child,
            );
          },
          child: Image.asset(
            widget.mood.sheet,
            width: size * _columns,
            height: size * _rows,
            excludeFromSemantics: true,
            gaplessPlayback: true,
          ),
        ),
      ),
    );
    if (widget.decorative) return ExcludeSemantics(child: picture);
    return Semantics(
      label: widget.label ?? AppLocalizations.of(context).wambiMood,
      image: true,
      child: picture,
    );
  }
}
