package com.wambito.app.capture

import android.content.Context

/** The sources the person turned on, by their wire name, in the prefs file `wambito.capture.sources`. */
class CaptureSettings(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun enabled(): Set<CaptureSource> =
        (preferences.getStringSet(ENABLED, null) ?: emptySet()).mapNotNull { CaptureSource.forWire(it) }.toSet()

    fun isEnabled(source: CaptureSource): Boolean = source in enabled()

    fun setEnabled(source: CaptureSource, enabled: Boolean) {
        val wires = enabled().map { it.wire }.toMutableSet()
        if (enabled) wires.add(source.wire) else wires.remove(source.wire)
        preferences.edit().putStringSet(ENABLED, wires).commit()
    }

    companion object {
        /** Persistent name: never renamed. */
        internal const val FILE = "wambito.capture.sources"
        private const val ENABLED = "enabled"
    }
}
