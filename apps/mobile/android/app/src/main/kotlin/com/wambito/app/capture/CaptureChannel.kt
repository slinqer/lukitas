package com.wambito.app.capture

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/** The app's hand on automatic capture (lib/capture): access, enabled sources, the settings screens. */
class CaptureChannel(private val activity: Activity, messenger: BinaryMessenger) {
    private val channel = MethodChannel(messenger, NAME)

    init {
        channel.setMethodCallHandler(::handle)
    }

    private fun handle(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "status" -> result.success(status())
            "setSource" -> {
                val source = call.argument<String>("source")?.let { CaptureSource.forWire(it) }
                val enabled = call.argument<Boolean>("enabled")
                if (source == null || enabled == null) {
                    result.error("bad_args", "source and enabled are required", null)
                } else {
                    CaptureSettings(activity).setEnabled(source, enabled)
                    result.success(null)
                }
            }
            "openAccessSettings" -> result.success(open(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)))
            "openAppInfo" -> result.success(
                open(
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        .setData(Uri.fromParts("package", activity.packageName, null)),
                ),
            )
            // On sign-out: captures of the account that left must not be sent for the next one.
            "clearQueue" -> {
                CaptureQueue(activity).clear()
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun status(): Map<String, Any> {
        val granted = NotificationManagerCompat.getEnabledListenerPackages(activity).contains(activity.packageName)
        return mapOf(
            "access" to if (granted) "granted" else "missing",
            "sources" to CaptureSettings(activity).enabled().map { it.wire },
        )
    }

    private fun open(intent: Intent): Boolean = try {
        activity.startActivity(intent)
        true
    } catch (_: Exception) {
        false
    }

    fun dispose() {
        channel.setMethodCallHandler(null)
    }

    companion object {
        const val NAME = "wambito/capture"
    }
}
