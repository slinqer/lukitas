package com.wambito.app.capture

import android.content.Context
import com.wambito.app.AppLanguages
import com.wambito.app.R
import com.wambito.app.notices.NoticeSettings
import com.wambito.app.notices.NoticeText
import com.wambito.app.widget.formatMoney
import java.util.Locale

/**
 * The words of the capture notification, from the Android string resources, in the language the app
 * is set to (the notices' [NoticeSettings.language]); null follows the phone. The money is written
 * by widget/Money.kt, as in the widget.
 */
object CaptureText {
    /** The app's language, else the phone's when the app speaks it, else Spanish. */
    fun languageOf(context: Context): String =
        NoticeSettings(context).language?.takeIf { it in AppLanguages.ALL }
            ?: Locale.getDefault().language.takeIf { it in AppLanguages.ALL }
            ?: "es"

    /** "Anoté −12,50 € en Mercadona · Supermercado, ¿bien?"; the fallback category asks which one. */
    fun noted(context: Context, answer: CaptureAnswer, language: String): String {
        val speaking = NoticeText.localized(context, language)
        val sign = if (answer.amountCents > 0) "+" else ""
        val money = sign + formatMoney(answer.amountCents, answer.currency, language)
        val resource = if (answer.isFallback) R.string.capture_noted_fallback else R.string.capture_noted
        return speaking.getString(resource, money, answer.name, answer.categoryName)
    }

    /** "3 gastos por revisar", on the group's summary. */
    fun summary(context: Context, count: Int, language: String): String =
        NoticeText.localized(context, language).resources.getQuantityString(R.plurals.capture_summary, count, count)

    /** "Inicia sesión para guardar 2 gastos detectados". */
    fun signInNeeded(context: Context, count: Int, language: String): String =
        NoticeText.localized(context, language).resources.getQuantityString(R.plurals.capture_sign_in, count, count)

    fun confirmLabel(context: Context, language: String): String =
        NoticeText.localized(context, language).getString(R.string.capture_confirm)

    fun changeLabel(context: Context, language: String): String =
        NoticeText.localized(context, language).getString(R.string.capture_change)

    fun channelName(context: Context, language: String): String =
        NoticeText.localized(context, language).getString(R.string.capture_channel)

    fun channelDescription(context: Context, language: String): String =
        NoticeText.localized(context, language).getString(R.string.capture_channel_description)
}
