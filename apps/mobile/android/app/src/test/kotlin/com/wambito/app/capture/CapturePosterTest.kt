package com.wambito.app.capture

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.wambito.app.launch.LaunchLinks
import com.wambito.app.notices.NoticeSettings
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class CapturePosterTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val manager = context.getSystemService(NotificationManager::class.java)

    @Before
    fun setUp() {
        NoticeSettings(context).language = "es"
    }

    @After
    fun tearDown() {
        manager.cancelAll()
        NoticeSettings(context).clear()
    }

    private fun answer(id: String, merchant: String = "Mercadona", merged: Boolean = false) =
        CaptureAnswer(merged, id, -1250, "EUR", merchant, "Supermercado", false)

    private fun active() = manager.activeNotifications.filter { it.notification.group == CapturePoster.GROUP }

    private fun isSummary(n: Notification) = n.flags and Notification.FLAG_GROUP_SUMMARY != 0

    private fun children() = active().filter { !isSummary(it.notification) }

    @Test
    fun `the same transaction gets the same notification id`() {
        assertEquals(CapturePoster.notificationId("t-1"), CapturePoster.notificationId("t-1"))
        assertTrue(CapturePoster.notificationId("t-1") != CapturePoster.notificationId("t-2"))
        assertTrue(CapturePoster.notificationId("any") >= 0)
    }

    @Test
    fun `a capture is a silent notification with Bien and Cambiar`() {
        CapturePoster.show(context, answer("t-1"))

        val shown = children().single().notification
        assertEquals("wambito.capture", shown.channelId)
        assertEquals(
            "Anoté −12,50 € en Mercadona · Supermercado, ¿bien?",
            shown.extras.getString(Notification.EXTRA_TEXT),
        )
        assertEquals(listOf("Bien", "Cambiar"), shown.actions.map { it.title.toString() })
        val channel = manager.getNotificationChannel("wambito.capture")
        assertEquals(NotificationManager.IMPORTANCE_LOW, channel.importance)
    }

    @Test
    fun `Bien is an immutable broadcast to the receiver and Cambiar opens the review link`() {
        CapturePoster.show(context, answer("t-1"))
        val shown = children().single().notification

        val bien = shadowOf(shown.actions[0].actionIntent)
        assertTrue(bien.isBroadcast)
        assertEquals(ConfirmReceiver::class.java.name, bien.savedIntents.single().component?.className)
        assertEquals("t-1", bien.savedIntents.single().getStringExtra(ConfirmReceiver.EXTRA_ID))
        assertTrue(bien.flags and PendingIntent.FLAG_IMMUTABLE != 0)

        val cambiar = shadowOf(shown.actions[1].actionIntent)
        assertTrue(cambiar.isActivity)
        assertEquals("wambito://review/t-1", cambiar.savedIntents.single().dataString)
        assertEquals(LaunchLinks.ALIAS, cambiar.savedIntents.single().component?.className)
        assertTrue(cambiar.flags and PendingIntent.FLAG_IMMUTABLE != 0)
    }

    @Test
    fun `a merged answer updates the same notification, not adds`() {
        CapturePoster.show(context, answer("t-1"))
        CapturePoster.show(context, answer("t-1", merged = true))
        assertEquals(1, children().size)
    }

    @Test
    fun `two or more captures get one summary, and it goes when one is left`() {
        CapturePoster.show(context, answer("t-1"))
        assertEquals(1, active().size)

        CapturePoster.show(context, answer("t-2", "Café"))
        CapturePoster.show(context, answer("t-3", "Pan"))
        val summary = active().single { isSummary(it.notification) }
        assertEquals("3 gastos por revisar", summary.notification.extras.getString(Notification.EXTRA_TEXT))

        CapturePoster.dismiss(context, "t-2")
        CapturePoster.dismiss(context, "t-3")
        assertEquals(listOf(CapturePoster.notificationId("t-1")), active().map { it.id })
    }

    @Test
    fun `the sign-in notice says how many wait and opens the app`() {
        CapturePoster.signInNeeded(context, 2)
        val posted = manager.activeNotifications.single().notification
        assertEquals("Inicia sesión para guardar 2 gastos detectados", posted.extras.getString(Notification.EXTRA_TEXT))
        assertEquals(0, posted.actions?.size ?: 0)
    }

    @Test
    fun `with notifications disabled nothing is posted and nothing breaks`() {
        shadowOf(manager).setNotificationsEnabled(false)
        CapturePoster.show(context, answer("t-1"))
        assertTrue(manager.activeNotifications.isEmpty())
    }
}
