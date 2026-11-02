import 'package:flutter_test/flutter_test.dart';
import 'package:wambito/api/gen/wambito_api.dart';
import 'package:wambito/home/wambi_line.dart';

import 'fixtures.dart';

WambiLine line({
  required Summary summary,
  String today = '2026-10-21',
  int todayCount = 0,
  WambiEvent? event,
}) => wambiLine(
  summary: summary,
  today: today,
  todayCount: todayCount,
  event: event,
  categoryName: (id) => const {'cat-groceries': 'Supermercado', 'cat-fun': 'Ocio'}[id] ?? '',
);

void main() {
  group('wambiLine (core wambiMessage, then the home fixes)', () {
    test('names the category near its limit and its remaining cents', () {
      final l = line(
        summary: summary(
          budgetTotal: 100000,
          spent: 40000,
          categories: [
            categorySummary('cat-groceries', budget: 50000, spent: 45000, state: 'near'),
          ],
        ),
      );
      expect(l.key, WambiKey.nearLimit);
      expect(l.category, 'Supermercado');
      expect(l.remaining, 5000);
    });

    test('formats the overspend as a positive amount', () {
      final l = line(
        summary: summary(
          budgetTotal: 100000,
          spent: 40000,
          categories: [
            categorySummary('cat-groceries', budget: 50000, spent: 51408, state: 'over'),
          ],
        ),
      );
      expect(l.key, WambiKey.overBudget);
      expect(l.over, 1408);
    });

    test('is on track with what is left and the days to go (today included)', () {
      final l = line(summary: summary(budgetTotal: 100000, spent: 40000));
      expect(l.key, WambiKey.onTrack);
      expect(l.remaining, 60000);
      expect(l.daysLeft, 11);
    });

    test('talks about an income event and names it', () {
      final l = line(
        summary: summary(budgetTotal: 100000, spent: 40000),
        todayCount: 2,
        event: const WambiEvent(
          kind: WambiEventKind.saved,
          categoryId: 'cat-salary',
          amount: 250000,
          name: 'Nómina',
        ),
      );
      expect(l.key, WambiKey.incomeReceived);
      expect(l.amount, 250000);
      expect(l.name, 'Nómina');
    });

    test('names a paid movement, or says its category when it has no name', () {
      WambiLine paid(String name) => line(
        summary: summary(budgetTotal: 100000, spent: 40000),
        todayCount: 2,
        event: WambiEvent(
          kind: WambiEventKind.paid,
          categoryId: 'cat-fun',
          amount: -3200,
          name: name,
        ),
      );
      expect(paid('gym').key, WambiKey.pendingPaid);
      expect(paid('gym').name, 'gym');
      expect(paid('gym').amount, 3200);
      expect(paid('').name, 'Ocio');
    });

    test('without budgets, never says what is left: it says what was spent', () {
      final l = line(
        summary: summary(
          budgetTotal: 0,
          spent: 40000,
          remaining: -40000,
          categories: [categorySummary('cat-groceries', spent: 40000)],
        ),
      );
      expect(l.key, WambiKey.noBudget);
      expect(l.spent, 40000);
    });

    test('on an empty month without budgets, invites the first entry', () {
      expect(line(summary: summary()).key, WambiKey.empty);
    });

    test("never calls a negative total 'on track'", () {
      final l = line(summary: summary(budgetTotal: 10000, spent: 15000));
      expect(l.key, WambiKey.overTotal);
      expect(l.over, 5000);
    });

    test("keeps the save's own message (first of the day) even without budgets", () {
      final l = line(
        todayCount: 1,
        summary: summary(categories: [categorySummary('cat-groceries', spent: 608)], spent: 608),
        event: const WambiEvent(
          kind: WambiEventKind.saved,
          categoryId: 'cat-groceries',
          amount: -608,
          name: 'pan',
        ),
      );
      expect(l.key, WambiKey.firstOfDay);
      expect(l.name, 'pan');
    });

    test('marks the last day of the month, and a month closed in the green', () {
      final s = summary(budgetTotal: 100000, spent: 40000);
      expect(line(summary: s, today: '2026-10-31').key, WambiKey.monthLastDay);
      expect(line(summary: s, today: '2026-11-03').key, WambiKey.monthClosedGreen);
    });

    test('a pending income marked paid was received, not paid', () {
      final l = line(
        summary: summary(budgetTotal: 100000, spent: 40000),
        todayCount: 2,
        event: const WambiEvent(
          kind: WambiEventKind.paid,
          categoryId: 'cat-salary',
          amount: 90000,
          name: 'Nómina',
        ),
      );
      expect(l.key, WambiKey.incomeReceived);
    });
  });
}
