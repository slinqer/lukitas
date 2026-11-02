// 2b: remove (with lib/storage/migrate_keys.dart): the keys stored under the old name move once.
import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/home/widget_snapshot.dart';
import 'package:wambito/storage/migrate_keys.dart';

import '../home/fakes.dart';

void main() {
  test('copies and removes: lukitas.widget.snapshot becomes wambito.widget.snapshot', () async {
    final store = FakeWidgetStore()..saved['lukitas.widget.snapshot'] = '{"v":3}';

    await migrateStoredKeys(store);

    expect(store.saved, {'wambito.widget.snapshot': '{"v":3}'});
    expect(widgetSnapshotKey, 'wambito.widget.snapshot');
  });

  test('does not overwrite a new key', () async {
    final store = FakeWidgetStore()
      ..saved['lukitas.widget.snapshot'] = '{"v":3,"old":true}'
      ..saved['wambito.widget.snapshot'] = '{"v":3}';

    await migrateStoredKeys(store);

    expect(store.saved, {'wambito.widget.snapshot': '{"v":3}'});
  });

  test('second run is a no-op', () async {
    final store = FakeWidgetStore()..saved['lukitas.widget.snapshot'] = '{"v":3}';

    await migrateStoredKeys(store);
    store.saved['wambito.widget.snapshot'] = '{"v":3,"newer":true}';
    await migrateStoredKeys(store);

    expect(store.saved, {'wambito.widget.snapshot': '{"v":3,"newer":true}'});
  });

  test('a lukas. key moves too, and nothing else is touched', () async {
    final store = FakeWidgetStore()
      ..saved['lukas.widget.snapshot'] = '{"v":3}'
      ..saved['other'] = 'x';

    await migrateStoredKeys(store, keys: ['lukas.widget.snapshot', 'other']);

    expect(store.saved, {'wambito.widget.snapshot': '{"v":3}', 'other': 'x'});
  });

  test('a store that cannot be reached is left as it is', () async {
    final store = FakeWidgetStore()..failure = Exception('no plugin');

    await migrateStoredKeys(store);

    expect(store.saved, isEmpty);
  });
}
