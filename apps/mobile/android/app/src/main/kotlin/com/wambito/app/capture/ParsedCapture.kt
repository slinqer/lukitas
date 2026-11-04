package com.wambito.app.capture

import java.time.Instant

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
