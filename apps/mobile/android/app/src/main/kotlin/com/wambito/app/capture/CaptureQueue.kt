package com.wambito.app.capture

import android.content.Context
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.time.Instant
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.UUID

/** A capture waiting to be sent, with the idempotency key every attempt of it carries. */
data class QueuedCapture(val key: String, val capture: ParsedCapture)

/**
 * The captures not yet saved on the server, in the order they were seen, in the SharedPreferences
 * file `wambito.capture.queue` (a persistent name: never renamed). It holds [ParsedCapture]'s
 * fields and the key, nothing else: no notification text ever reaches it.
 */
class CaptureQueue(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun add(capture: ParsedCapture): QueuedCapture = synchronized(LOCK) {
        val item = QueuedCapture(UUID.randomUUID().toString(), capture)
        write(read() + item)
        item
    }

    fun all(): List<QueuedCapture> = synchronized(LOCK) { read() }

    fun remove(key: String) = synchronized(LOCK) {
        val items = read()
        if (items.any { it.key == key }) write(items.filterNot { it.key == key })
    }

    fun clear() = synchronized(LOCK) { write(emptyList()) }

    private fun read(): List<QueuedCapture> {
        val raw = preferences.getString(ITEMS, null) ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).mapNotNull { decode(array.getJSONObject(it)) }
        } catch (_: JSONException) {
            emptyList()
        }
    }

    // commit(): the notification listener may be killed right after it queues a capture.
    private fun write(items: List<QueuedCapture>) {
        val array = JSONArray()
        items.forEach { array.put(encode(it)) }
        preferences.edit().putString(ITEMS, array.toString()).commit()
    }

    private fun encode(item: QueuedCapture) = JSONObject().apply {
        val capture = item.capture
        put("key", item.key)
        put("kind", capture.kind.name.lowercase())
        put("amount", capture.amountCents)
        put("currency", capture.currency)
        put("merchant", capture.merchant)
        put("capturedAt", capture.capturedAt.truncatedTo(ChronoUnit.MILLIS).toString())
        put("source", capture.source.wire)
    }

    /** An entry that cannot be read is skipped: it would only ever fail again. */
    private fun decode(json: JSONObject): QueuedCapture? = try {
        val source = CaptureSource.forWire(json.getString("source"))
        val kind = Kind.entries.firstOrNull { it.name.lowercase() == json.getString("kind") }
        if (source == null || kind == null) {
            null
        } else {
            QueuedCapture(
                key = json.getString("key"),
                capture = ParsedCapture(
                    kind = kind,
                    amountCents = json.getLong("amount"),
                    currency = json.getString("currency"),
                    merchant = json.getString("merchant"),
                    capturedAt = Instant.parse(json.getString("capturedAt")),
                    source = source,
                ),
            )
        }
    } catch (_: JSONException) {
        null
    } catch (_: DateTimeParseException) {
        null
    }

    companion object {
        /** The SharedPreferences file. */
        internal const val FILE = "wambito.capture.queue"
        private const val ITEMS = "items"
        private val LOCK = Any()
    }
}
