package com.wambito.app.capture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.wambito.app.R
import com.wambito.app.launch.LaunchLinks

/**
 * The silent notification of a detected transaction: "Anoté −12,50 € en Mercadona · Supermercado,
 * ¿bien?" with "Bien" (confirms without opening the app) and "Cambiar" (opens the review screen).
 * When notifications are not allowed (Android 13+ POST_NOTIFICATIONS, or the phone's switch) nothing
 * is posted: the capture is saved anyway and waits in the app.
 */
object CapturePoster : CaptureNotifier {
    /** Persistent name: never renamed. */
    const val CHANNEL = "wambito.capture"
    const val GROUP = "wambito.capture"

    private const val TAG = "wambito.capture"
    private const val SUMMARY_ID = -1701
    private const val SIGN_IN_ID = -1702

    /** Stable per transaction, so a merged answer updates the notification it already has. Never negative. */
    fun notificationId(transactionId: String): Int = transactionId.hashCode() and 0x7fffffff

    override fun show(context: Context, answer: CaptureAnswer) {
        val manager = managerFor(context) ?: return
        val language = CaptureText.languageOf(context)
        val id = notificationId(answer.id)
        val review = PendingIntent.getActivity(
            context,
            id,
            LaunchLinks.intent(context, LaunchLinks.review(answer.id)),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val confirm = PendingIntent.getBroadcast(
            context,
            id,
            Intent(context, ConfirmReceiver::class.java).putExtra(ConfirmReceiver.EXTRA_ID, answer.id),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val icon = android.graphics.drawable.Icon.createWithResource(context, R.drawable.ic_notice)
        val text = CaptureText.noted(context, answer, language)
        val notification = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notice)
            .setContentTitle(context.getString(R.string.notice_title))
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setCategory(Notification.CATEGORY_STATUS)
            .setGroup(GROUP)
            .setContentIntent(review)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .addAction(Notification.Action.Builder(icon, CaptureText.confirmLabel(context, language), confirm).build())
            .addAction(Notification.Action.Builder(icon, CaptureText.changeLabel(context, language), review).build())
            .build()
        manager.notify(TAG, id, notification)
        refreshSummary(context, manager)
    }

    override fun signInNeeded(context: Context, count: Int) {
        if (count <= 0) return
        val manager = managerFor(context) ?: return
        val language = CaptureText.languageOf(context)
        val text = CaptureText.signInNeeded(context, count, language)
        val open = PendingIntent.getActivity(
            context,
            SIGN_IN_ID,
            LaunchLinks.intent(context, LaunchLinks.HOME),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notice)
            .setContentTitle(context.getString(R.string.notice_title))
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setCategory(Notification.CATEGORY_STATUS)
            .setContentIntent(open)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .build()
        manager.notify(TAG, SIGN_IN_ID, notification)
    }

    /** Removes the notification of [transactionId] (confirmed), and the summary if one is left alone. */
    fun cancel(context: Context, transactionId: String) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.cancel(TAG, notificationId(transactionId))
        refreshSummary(context, manager)
    }

    /** Posts the group's summary when two or more captures wait, and takes it away otherwise. */
    private fun refreshSummary(context: Context, manager: NotificationManager) {
        val count = manager.activeNotifications.count {
            it.notification.group == GROUP && it.notification.flags and Notification.FLAG_GROUP_SUMMARY == 0
        }
        if (count < 2) {
            manager.cancel(TAG, SUMMARY_ID)
            return
        }
        val text = CaptureText.summary(context, count, CaptureText.languageOf(context))
        val summary = Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notice)
            .setContentTitle(context.getString(R.string.notice_title))
            .setContentText(text)
            .setCategory(Notification.CATEGORY_STATUS)
            .setGroup(GROUP)
            .setGroupSummary(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(true)
            .build()
        manager.notify(TAG, SUMMARY_ID, summary)
    }

    /** The manager with the channel created, or null when notifications are not allowed. */
    private fun managerFor(context: Context): NotificationManager? {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return null
        if (!manager.areNotificationsEnabled()) return null
        ensureChannel(context, manager)
        return manager
    }

    /** Creates the channel, or renames it for the phone's language; the person's own settings stay. */
    private fun ensureChannel(context: Context, manager: NotificationManager) {
        val language = CaptureText.languageOf(context)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, CaptureText.channelName(context, language), NotificationManager.IMPORTANCE_LOW)
                .apply { description = CaptureText.channelDescription(context, language) },
        )
    }
}
