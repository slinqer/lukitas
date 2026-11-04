package com.wambito.app.capture

import androidx.annotation.VisibleForTesting
import java.time.Instant

/** Reads one bank app's notification. Returns null when it is not a movement it understands. */
interface BankParser {
    val source: CaptureSource

    fun parse(title: String?, text: String?, postedAt: Instant): ParsedCapture?
}

/**
 * The parsers by source. Empty until real notification samples exist: until then every
 * notification is dropped.
 */
object BankParsers {
    @VisibleForTesting
    var parsers: List<BankParser> = emptyList()

    fun parse(source: CaptureSource, title: String?, text: String?, postedAt: Instant): ParsedCapture? =
        parsers.firstOrNull { it.source == source }?.parse(title, text, postedAt)
}
