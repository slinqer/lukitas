package com.wambito.app.capture

import android.content.Context
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject
import java.util.UUID

/**
 * A capture waiting to be sent, with the idempotency key every attempt of it carries and the id of
 * the account it was captured for ([CaptureQueue.owner] then); null when no account was known
 * (signed out, or queued by a build before captures were tagged).
 */
data class QueuedCapture(val key: String, val capture: ParsedCapture, val userId: String? = null)

/**
 * The captures not yet saved on the server, in the order they were seen, in the SharedPreferences
 * file `wambito.capture.queue` (a persistent name: never renamed). It holds [ParsedCapture]'s
 * fields, the key and the account id, nothing else: no notification text ever reaches it.
 *
 * The queue belongs to one account, its [owner], which the app sets after every sign-in
 * ([adopt], through `sendQueued` on the `wambito/capture` channel). A capture is tagged with the
 * owner of the moment, so captures kept through a 401 go to their account when it signs in again,
 * and never to another one (R15).
 */
class CaptureQueue(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun add(capture: ParsedCapture): QueuedCapture = synchronized(LOCK) {
        val item = QueuedCapture(UUID.randomUUID().toString(), capture, owner())
        write(read() + item)
        item
    }

    fun all(): List<QueuedCapture> = synchronized(LOCK) { read() }

    /** The account the queue belongs to, or null when none is known (never signed in, signed out). */
    fun owner(): String? = preferences.getString(OWNER, null)

    /**
     * The session mark ([com.wambito.app.widget.SessionSource.mark]) the owner was set under. The
     * mark changes on every token write, so a token stored after the last [adopt] (another account
     * signing in, before the app says so) does not match it, and nothing is sent until it does.
     */
    fun ownerMark(): String? = preferences.getString(OWNER_MARK, null)

    /**
     * [userId] signed in, under the session [mark]: the queue is now theirs. Captures of another
     * account, and those of no known account (they could be anyone's), are dropped; theirs stay to
     * be sent.
     */
    fun adopt(userId: String, mark: String? = null): Unit = synchronized(LOCK) {
        val items = read()
        val mine = items.filter { it.userId == userId }
        val edit = preferences.edit().putString(OWNER, userId)
        if (mark == null) edit.remove(OWNER_MARK) else edit.putString(OWNER_MARK, mark)
        if (mine.size != items.size) edit.putString(ITEMS, encodeAll(mine))
        edit.commit()
    }

    fun remove(key: String) = synchronized(LOCK) {
        val items = read()
        if (items.any { it.key == key }) write(items.filterNot { it.key == key })
    }

    /** Signed out: the captures and whose they were are forgotten. */
    fun clear(): Unit = synchronized(LOCK) {
        preferences.edit().putString(ITEMS, encodeAll(emptyList())).remove(OWNER).remove(OWNER_MARK).commit()
    }

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
        preferences.edit().putString(ITEMS, encodeAll(items)).commit()
    }

    private fun encodeAll(items: List<QueuedCapture>): String {
        val array = JSONArray()
        items.forEach { array.put(encode(it)) }
        return array.toString()
    }

    private fun encode(item: QueuedCapture): JSONObject {
        val json = item.capture.toJson().put("key", item.key)
        if (item.userId != null) json.put(USER, item.userId)
        return json
    }

    /** An entry that cannot be read is skipped: it would only ever fail again. */
    private fun decode(json: JSONObject): QueuedCapture? {
        val key = json.optString("key").takeIf { it.isNotEmpty() } ?: return null
        val userId = json.optString(USER).takeIf { it.isNotEmpty() }
        return parsedCaptureFromJson(json)?.let { QueuedCapture(key, it, userId) }
    }

    companion object {
        /** The SharedPreferences file. */
        internal const val FILE = "wambito.capture.queue"
        private const val ITEMS = "items"
        private const val OWNER = "owner"
        private const val OWNER_MARK = "ownerMark"
        private const val USER = "user"
        private val LOCK = Any()
    }
}
