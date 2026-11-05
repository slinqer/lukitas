package com.wambito.app.capture

import org.json.JSONException
import org.json.JSONObject
import java.time.Instant
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit

enum class Kind { EXPENSE, INCOME }

/**
 * What a bank notification says, once a parser has read it: the only thing about it that is ever
 * queued, sent or logged. The notification's own text is never part of it.
 */
data class ParsedCapture(
    val kind: Kind,
    /** Always positive; [kind] says the direction. */
    val amountCents: Long,
    /** ISO 4217. */
    val currency: String,
    val merchant: String,
    val capturedAt: Instant,
    val source: CaptureSource,
)

/** The six fields, as the API takes them and the queue stores them: one shape for both. */
fun ParsedCapture.toJson(): JSONObject = JSONObject()
    .put("kind", kind.name.lowercase())
    .put("amount", amountCents)
    .put("currency", currency)
    .put("merchant", merchant)
    .put("capturedAt", capturedAt.truncatedTo(ChronoUnit.MILLIS).toString())
    .put("source", source.wire)

/** The inverse of [toJson]; null when a field is missing, unknown or malformed. */
fun parsedCaptureFromJson(json: JSONObject): ParsedCapture? = try {
    val source = CaptureSource.forWire(json.getString("source"))
    val kind = Kind.entries.firstOrNull { it.name.lowercase() == json.getString("kind") }
    if (source == null || kind == null) {
        null
    } else {
        ParsedCapture(
            kind = kind,
            amountCents = json.getLong("amount"),
            currency = json.getString("currency"),
            merchant = json.getString("merchant"),
            capturedAt = Instant.parse(json.getString("capturedAt")),
            source = source,
        )
    }
} catch (_: JSONException) {
    null
} catch (_: DateTimeParseException) {
    null
}
