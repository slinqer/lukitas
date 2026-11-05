package com.wambito.app.capture

import java.time.Instant

/**
 * Google Wallet, European Portuguese, expenses only: title = the merchant (upper case, kept as it
 * arrives: the server normalizes it), text = "<amount> € com o cartão <card> ••<4 digits>". Income and
 * the other languages wait for samples.
 */
object GoogleWalletParser : BankParser {
    override val source = CaptureSource.GOOGLE_WALLET

    private val EXPENSE = Regex("^${PtAmount.PATTERN}[   ]+com o cartão .+ ••\\d{4}$")

    override fun parse(title: String?, text: String?, postedAt: Instant): ParsedCapture? {
        val merchant = title?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val match = EXPENSE.matchEntire(text?.trim() ?: return null) ?: return null
        val (cents, currency) = PtAmount.read(match, 1) ?: return null
        return ParsedCapture(Kind.EXPENSE, cents, currency, merchant, postedAt, source)
    }
}
