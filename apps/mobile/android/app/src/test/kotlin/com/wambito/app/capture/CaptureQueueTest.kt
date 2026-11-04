package com.wambito.app.capture

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.time.Instant

internal fun sampleCapture(
    merchant: String = "Mercadona",
    amountCents: Long = 1250,
    kind: Kind = Kind.EXPENSE,
    source: CaptureSource = CaptureSource.REVOLUT,
) = ParsedCapture(kind, amountCents, "EUR", merchant, Instant.parse("2026-11-04T12:30:15.123Z"), source)

@RunWith(RobolectricTestRunner::class)
class CaptureQueueTest {
    private val context: Context = ApplicationProvider.getApplicationContext()

    @After
    fun tearDown() = CaptureQueue(context).clear()

    @Test
    fun `a new instance finds what an earlier one queued, in order`() {
        val first = CaptureQueue(context).add(sampleCapture("Mercadona"))
        val second = CaptureQueue(context).add(sampleCapture("Café", source = CaptureSource.GOOGLE_WALLET))

        val items = CaptureQueue(context).all()
        assertEquals(listOf(first, second), items)
        assertNotEquals(first.key, second.key)
    }

    @Test
    fun `remove takes one item out and keeps the others`() {
        val queue = CaptureQueue(context)
        val first = queue.add(sampleCapture("Mercadona"))
        val second = queue.add(sampleCapture("Café"))

        queue.remove(first.key)

        assertEquals(listOf(second), CaptureQueue(context).all())
    }

    @Test
    fun `an income and a wallet source round-trip`() {
        val item = CaptureQueue(context).add(
            sampleCapture("Nómina", 250000, Kind.INCOME, CaptureSource.GOOGLE_WALLET),
        )
        assertEquals(item, CaptureQueue(context).all().single())
    }

    @Test
    fun `only the capture's own fields and the key are stored`() {
        CaptureQueue(context).add(sampleCapture())
        val raw = context.getSharedPreferences("wambito.capture.queue", Context.MODE_PRIVATE).all.values.single() as String
        val entry = org.json.JSONObject(org.json.JSONArray(raw).getJSONObject(0).toString())
        val keys = entry.keys().asSequence().toSet()
        assertEquals(setOf("key", "kind", "amount", "currency", "merchant", "capturedAt", "source"), keys)
        assertTrue(raw.contains("\"kind\":\"expense\""))
    }

    @Test
    fun `an entry that cannot be read is skipped`() {
        context.getSharedPreferences("wambito.capture.queue", Context.MODE_PRIVATE).edit()
            .putString("items", """[{"key":"a","kind":"nope"}]""").commit()
        assertTrue(CaptureQueue(context).all().isEmpty())
    }

    @Test
    fun `sources are found by package and by wire name`() {
        assertEquals(CaptureSource.REVOLUT, CaptureSource.forPackage("com.revolut.revolut"))
        assertEquals(CaptureSource.GOOGLE_WALLET, CaptureSource.forPackage("com.google.android.apps.walletnfcrel"))
        assertEquals(null, CaptureSource.forPackage("com.example.other"))
    }
}
