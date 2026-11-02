// 2b: remove (the whole file, its call in main.dart and its test): once every phone has opened a
// Wambito build, no key is left under the old name.
import '../home/widget_snapshot.dart';

/// The app's own stored keys that carried the old name. The widget snapshot is the only one: the
/// app's other values live in secure storage under names without a prefix (`session.token`,
/// `setting.theme`), and `home_widget` cannot list what it holds, so the keys are named here.
const oldStoredKeys = ['lukitas.widget.snapshot'];

/// The prefixes the old keys start with, and the one that takes their place.
const _oldPrefixes = ['lukitas.', 'lukas.'];
const _newPrefix = 'wambito.';

/// Moves each of [keys] that starts with `lukitas.` or `lukas.` to the same name under `wambito.`
/// in [store] (the `home_widget` SharedPreferences the Kotlin widget reads too): the old value is
/// copied when the new key is unset, then the old key is removed. A new key already there wins.
/// A second run finds nothing to move. It runs once at startup, before anything reads the store
/// (main.dart); a store that cannot be reached (no plugin, a storage error) is left as it is.
///
/// Android's own Migration (Kotlin) moves the same key when a widget or a job runs first; both
/// follow the same rule, so whichever runs first wins and the other finds nothing.
Future<void> migrateStoredKeys(WidgetStore store, {Iterable<String> keys = oldStoredKeys}) async {
  for (final old in keys) {
    final prefix = _oldPrefixes.where(old.startsWith).firstOrNull;
    if (prefix == null) continue;
    final key = '$_newPrefix${old.substring(prefix.length)}';
    try {
      final value = await store.read(old);
      if (value == null) continue;
      if (await store.read(key) == null) await store.save(key, value);
      await store.remove(old);
    } on Object {
      // Left for the next start.
    }
  }
}
