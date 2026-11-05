package com.wambito.app.capture

import java.time.Instant

/**
 * Revolut, European Portuguese, expenses only: title = the merchant, text = "<emoji> Gastou <amount> €"
 * and then the balance line, which is never read. Income and the other languages wait for samples.
 */
object RevolutParser : BankParser {
    override val source = CaptureSource.REVOLUT

    // The first line only: an optional emoji (no letters), "Gastou" and the money.
    private val EXPENSE = Regex("^[^\\p{L}\\p{N}]*Gastou[   ]+${PtAmount.PATTERN}$")

    override fun parse(title: String?, text: String?, postedAt: Instant): ParsedCapture? {
        val merchant = title?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val firstLine = text?.lineSequence()?.firstOrNull()?.trim() ?: return null
        val match = EXPENSE.matchEntire(firstLine) ?: return null
        val (cents, currency) = PtAmount.read(match, 1) ?: return null
        return ParsedCapture(Kind.EXPENSE, cents, currency, merchant, postedAt, source)
    }
}
