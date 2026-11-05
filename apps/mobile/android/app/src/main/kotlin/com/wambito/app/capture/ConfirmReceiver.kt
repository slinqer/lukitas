package com.wambito.app.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * "Bien" on a capture notification: confirms the transaction without opening the app. Not exported
 * (AndroidManifest.xml): only the notification's own PendingIntent can reach it. The work waits for
 * a network, so a tap offline still confirms later.
 */
class ConfirmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_ID)?.takeIf { it.isNotEmpty() } ?: return
        CaptureScheduler.enqueueConfirm(context, id)
    }

    companion object {
        const val EXTRA_ID = "transactionId"
    }
}
