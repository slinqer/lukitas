package com.wambito.app.capture

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CaptureTextTest {
    private val context: Context = ApplicationProvider.getApplicationContext()

    // The money is widget/Money.kt's: a no-break space before the euro sign in es, it and pt.
    private val nb = " "

    private fun answer(
        cents: Long = -1250,
        category: String = "Supermercado",
        fallback: Boolean = false,
        currency: String = "EUR",
    ) = CaptureAnswer(false, "t-1", cents, currency, "Mercadona", category, fallback)

    @Test
    fun `a known category asks whether it is right, in the four languages`() {
        assertEquals(
            "Anoté −12,50$nb€ en Mercadona · Supermercado, ¿bien?",
            CaptureText.noted(context, answer(), "es"),
        )
        assertEquals(
            "Noted −€12.50 at Mercadona · Groceries, OK?",
            CaptureText.noted(context, answer(category = "Groceries"), "en"),
        )
        assertEquals(
            "Ho annotato −12,50$nb€ da Mercadona · Supermercato, va bene?",
            CaptureText.noted(context, answer(category = "Supermercato"), "it"),
        )
        assertEquals(
            "Anotei −12,50$nb€ em Mercadona · Supermercado, certo?",
            CaptureText.noted(context, answer(), "pt"),
        )
    }

    @Test
    fun `the fallback category asks which category`() {
        assertEquals(
            "Anoté −12,50$nb€ en Mercadona · Otros gastos, ¿qué categoría?",
            CaptureText.noted(context, answer(category = "Otros gastos", fallback = true), "es"),
        )
        assertEquals(
            "Noted −€12.50 at Mercadona · Other expenses, which category?",
            CaptureText.noted(context, answer(category = "Other expenses", fallback = true), "en"),
        )
        assertEquals(
            "Ho annotato −12,50$nb€ da Mercadona · Altre spese, quale categoria?",
            CaptureText.noted(context, answer(category = "Altre spese", fallback = true), "it"),
        )
        assertEquals(
            "Anotei −12,50$nb€ em Mercadona · Outras despesas, que categoria?",
            CaptureText.noted(context, answer(category = "Outras despesas", fallback = true), "pt"),
        )
    }

    @Test
    fun `income carries a plus sign`() {
        assertEquals(
            "Anoté +12,50$nb€ en Mercadona · Supermercado, ¿bien?",
            CaptureText.noted(context, answer(cents = 1250), "es"),
        )
        assertEquals(
            "Noted +€12.50 at Mercadona · Groceries, OK?",
            CaptureText.noted(context, answer(cents = 1250, category = "Groceries"), "en"),
        )
    }

    @Test
    fun `the summary and the sign-in notice count in each language`() {
        assertEquals("3 gastos por revisar", CaptureText.summary(context, 3, "es"))
        assertEquals("3 to review", CaptureText.summary(context, 3, "en"))
        assertEquals("3 da rivedere", CaptureText.summary(context, 3, "it"))
        assertEquals("3 por rever", CaptureText.summary(context, 3, "pt"))
        assertEquals("Inicia sesión para guardar 2 gastos detectados", CaptureText.signInNeeded(context, 2, "es"))
        assertEquals("Sign in to save 2 detected transactions", CaptureText.signInNeeded(context, 2, "en"))
        assertEquals("Accedi per salvare 2 movimenti rilevati", CaptureText.signInNeeded(context, 2, "it"))
        assertEquals("Inicia sessão para guardar 2 movimentos detetados", CaptureText.signInNeeded(context, 2, "pt"))
        assertEquals("Inicia sesión para guardar 1 gasto detectado", CaptureText.signInNeeded(context, 1, "es"))
    }

    @Test
    fun `buttons and channel name`() {
        assertEquals("Bien", CaptureText.confirmLabel(context, "es"))
        assertEquals("Cambiar", CaptureText.changeLabel(context, "es"))
        assertEquals("OK", CaptureText.confirmLabel(context, "en"))
        assertEquals("Change", CaptureText.changeLabel(context, "en"))
        assertEquals("Va bene", CaptureText.confirmLabel(context, "it"))
        assertEquals("Cambia", CaptureText.changeLabel(context, "it"))
        assertEquals("Certo", CaptureText.confirmLabel(context, "pt"))
        assertEquals("Alterar", CaptureText.changeLabel(context, "pt"))
        assertEquals("Gastos detectados", CaptureText.channelName(context, "es"))
        assertEquals("Detected transactions", CaptureText.channelName(context, "en"))
        assertEquals("Movimenti rilevati", CaptureText.channelName(context, "it"))
        assertEquals("Movimentos detetados", CaptureText.channelName(context, "pt"))
    }
}
