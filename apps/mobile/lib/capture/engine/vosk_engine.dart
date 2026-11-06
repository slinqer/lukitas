import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/services.dart';

import '../models_download.dart';
import 'grammar.dart';
import 'merge.dart';
import 'speech_engine.dart';
import 'voice_channel.dart';

/// How long a pause after some words ends listening.
const endOfSpeechPause = Duration(milliseconds: 1500);

/// Listening ends when nothing at all is heard for this long.
const nothingHeardLimit = Duration(seconds: 8);

/// The longest a sentence is listened to.
const longestListen = Duration(seconds: 30);

/// The longest the precise model is waited for, from the moment it starts (`refining`): then the
/// sentence closes with Vosk's text.
const refineLimit = Duration(seconds: 3);

/// The voice spike's engine (docs/superpowers/reports/2026-10-22-stage-3-voice-spike.md): Vosk
/// small, on the phone, with no network. Two recognizers share one model while the person speaks,
/// a free one and one biased by a grammar of amount, kind, date and separator words (grammar.dart);
/// their words are merged by timestamps with rule v2 (merge.dart), and the merged text goes to the
/// rules parser unchanged. Every result at an endpoint is kept, not only the final one: the grammar
/// pass hits endpoints mid-sentence. When the precise model (canary) is installed for the language,
/// it rewrites the whole sentence after the recording ends and its text is the final one; if it
/// fails, is blank, or takes over [refineLimit], Vosk's merged text stands.
class VoskEngine implements SpeechEngine {
  VoskEngine({required this._channel, required this._models, required this._precise});

  final VoicePlatform _channel;
  final ModelStore _models;
  final ModelStore _precise;
  _Session? _session;
  final _levels = StreamController<double>.broadcast();
  final _refining = StreamController<bool>.broadcast();

  @override
  Future<bool> available() => _channel.supported();

  @override
  Stream<double> get levels => _levels.stream;

  @override
  Stream<bool> get refining => _refining.stream;

  @override
  Future<bool> isWarm({required String locale}) async {
    try {
      final path = await _models.installedPath(locale);
      if (path == null) return false;
      final precise = await _precise.installedPath(locale);
      return await _channel.isWarm(
        path,
        precisePath: precise,
        language: precise == null ? null : locale,
      );
    } on Object {
      return false;
    }
  }

  @override
  Future<void> warmUp({required String locale}) async {
    try {
      final path = await _models.installedPath(locale);
      if (path == null) return;
      final precise = await _precise.installedPath(locale);
      await _channel.warmUp(path, precisePath: precise, language: precise == null ? null : locale);
    } on Object {
      // Not loaded in advance: the first listen loads it, as it always did.
    }
  }

  @override
  Stream<String> listen({required String locale}) {
    final session = _Session(_channel, locale, _levels, _refining);
    _session = session;
    session.out = StreamController<String>(
      onListen: () => unawaited(session.begin(_models, _precise)),
      onCancel: session.cancel,
    );
    return session.out.stream;
  }

  @override
  Future<void> stop() async => _session?.stop();
}

class _Session {
  _Session(this._channel, this._locale, this._levels, this._refiningStates);

  final VoicePlatform _channel;
  final String _locale;
  final StreamController<double> _levels;
  final StreamController<bool> _refiningStates;
  late final StreamController<String> out;
  StreamSubscription<VoiceEvent>? _events;
  final _free = <HeardWord>[];
  final _grammar = <HeardWord>[];
  var _partial = '';
  var _stopping = false;

  /// The precise model's text, once it came and was not blank.
  String? _refined;
  var _refining = false;

  /// Bounds the whole refine, from its `refining` event. Not among [_cancelTimers]: [stop] clears
  /// those, and stopping must not give the precise model unlimited time.
  Timer? _refineTimer;

  /// Nobody listens any more (the sheet closed), maybe before recording even started.
  var _cancelled = false;
  Timer? _pause;
  Timer? _nothing;
  Timer? _longest;

  Future<void> begin(ModelStore models, ModelStore precise) async {
    try {
      final path = await models.installedPath(_locale);
      if (path == null) throw const SpeechFailure(SpeechFailureKind.noModel);
      final precisePath = await precise.installedPath(_locale);
      final granted = await _channel.requestPermission();
      if (!granted) throw const SpeechFailure(SpeechFailureKind.permissionDenied);
      if (out.isClosed || _cancelled) return;
      _longest = Timer(longestListen, () => unawaited(stop()));
      _events = _channel
          .start(
            modelPath: path,
            grammar: grammarJson(_locale),
            precisePath: precisePath,
            language: precisePath == null ? null : _locale,
          )
          .listen(_onEvent, onError: _fail, onDone: _finish);
    } on SpeechFailure catch (failure) {
      _fail(failure);
    } on PlatformException catch (error) {
      _fail(SpeechFailure(SpeechFailureKind.failed, error.code));
    }
  }

  String get _merged => mergePasses(_free, _grammar, _locale);

  /// What goes before the free pass's partial on screen: the merged words up to the free pass's
  /// last endpoint. The partial covers everything after it, so grammar words the grammar pass
  /// settled at an endpoint of its own past that point are already in the partial; showing them
  /// too repeated them ("dos euros dos euros en café").
  String get _settled {
    if (_free.isEmpty) return '';
    final upTo = _free.map((w) => w.end).reduce(math.max);
    return mergePasses(_free, [
      for (final g in _grammar)
        if (g.start < upTo) g,
    ], _locale);
  }

  void _onEvent(VoiceEvent event) {
    if (out.isClosed) return;
    switch (event) {
      case VoiceReady():
        // An empty first event: listening has really started (SpeechEngine.listen). The person's
        // 8 s to start talking count from here, not from the model load.
        _nothing ??= Timer(nothingHeardLimit, () => unawaited(stop()));
        out.add('');
      case VoiceLevel(:final value):
        if (_levels.hasListener) _levels.add(value);
      case VoicePartial(:final text):
        _partial = text;
        if (text.trim().isNotEmpty) {
          _nothing?.cancel();
          _pause?.cancel();
        }
        final heard = [_settled, text].where((t) => t.isNotEmpty).join(' ');
        if (heard.isNotEmpty) out.add(heard);
      case VoiceResult(:final pass, :final json):
        final words = wordsOfResult(json);
        (pass == VoicePass.free ? _free : _grammar).addAll(words);
        if (pass == VoicePass.free) {
          _partial = '';
          if (words.isNotEmpty) {
            _nothing?.cancel();
            _pause?.cancel();
            _pause = Timer(endOfSpeechPause, () => unawaited(stop()));
          }
        }
      case VoiceRefining():
        _refining = true;
        if (_refiningStates.hasListener) _refiningStates.add(true);
        _refineTimer ??= Timer(refineLimit, _finish);
      case VoiceRefined(:final text):
        // Blank is as good as nothing: Vosk's text stands (done follows).
        if (text.trim().isNotEmpty) _refined = text;
      case VoiceRefineFailed():
        break;
      case VoiceDone():
        _finish();
      case VoiceError(:final code):
        _fail(SpeechFailure(SpeechFailureKind.failed, code));
    }
  }

  /// The refine is over (the stream closes, fails or is let go): tells whoever watches.
  void _endRefine() {
    _refineTimer?.cancel();
    if (!_refining) return;
    _refining = false;
    if (_refiningStates.hasListener) _refiningStates.add(false);
  }

  void _fail(Object error) {
    _cancelTimers();
    _endRefine();
    if (out.isClosed) return;
    out.addError(
      error is SpeechFailure ? error : SpeechFailure(SpeechFailureKind.failed, '$error'),
    );
    unawaited(out.close());
    unawaited(_events?.cancel());
  }

  void _finish() {
    _cancelTimers();
    if (out.isClosed) {
      _endRefine();
      return;
    }
    _free.sort((a, b) => a.start.compareTo(b.start));
    _grammar.sort((a, b) => a.start.compareTo(b.start));
    final text = _merged;
    out.add(_refined ?? (text.isEmpty ? _partial : text));
    unawaited(out.close());
    unawaited(_events?.cancel());
    _endRefine();
  }

  Future<void> stop() async {
    _cancelTimers();
    if (_stopping || out.isClosed || _events == null) return;
    _stopping = true;
    await _channel.stop();
  }

  Future<void> cancel() async {
    _cancelled = true;
    _cancelTimers();
    _endRefine();
    // Cancelling the platform stream stops the recording (VoiceChannel.kt, onCancel).
    await _events?.cancel();
  }

  void _cancelTimers() {
    _pause?.cancel();
    _nothing?.cancel();
    _longest?.cancel();
  }
}
