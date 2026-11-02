// 2b: remove (this file, its calls and MigrationTest): once every phone has opened a Wambito build,
// nothing is left under the old name.
package com.wambito.app

import android.content.Context
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.wambito.app.notices.NoticeScheduler
import com.wambito.app.notices.NoticeSettings
import com.wambito.app.voice.WarmHint
import com.google.common.util.concurrent.ListenableFuture
import com.wambito.app.widget.RefreshScheduler
import java.time.Duration
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

/**
 * Moves what Android kept under the app's old name (Lukitas) to the new one (Wambito), once per
 * phone. It is called first wherever the app's own code can start: [MainActivity], each WorkManager
 * job ([com.wambito.app.notices.DueWorker], [com.wambito.app.notices.GuestWorker],
 * [com.wambito.app.widget.RefreshWorker]) and each widget receiver.
 *
 *  1. The SharedPreferences files `lukitas.widget.refresh`, `lukitas.notices` and `lukitas_voice`
 *     are copied into their new files when the new one is empty (a new file that has values wins),
 *     then deleted.
 *  2. The four old WorkManager unique jobs are cancelled. A notice job waiting under the old name is
 *     enqueued again under the new one, for the very time it was due, when its switch is on: none is
 *     lost and none is doubled. One that is running at that moment is left to finish (cancelling it
 *     would stop it halfway, maybe after it posted); it is a one-time job, and "Hoy vence…" enqueues
 *     its next run under the new name. The widget refresh jobs are only cancelled: the renamed
 *     receivers take placed widgets away (spec section 4.4), and the first widget added again
 *     schedules them under the new names.
 *  3. The notification channels keep their ids (`payments_due`, `guest_warning`): nothing to do.
 *  4. A flag records that it ran; until every step succeeded it runs again at the next start.
 *
 * Moved jobs are ones found waiting when WorkManager answers; a job of the old name that was
 * running then and asks to be retried is found waiting by the next run (no flag yet) or, after the
 * flag, runs once more under the old name and hands over to the new one: "Hoy vence…" posts once
 * per local day whatever runs it (NoticeSettings.lastDueDay).
 *
 * The widget snapshot (`lukitas.widget.snapshot`) is not moved here: it lives in home_widget's
 * SharedPreferences, under a key Dart's lib/storage/migrate_keys.dart moves at the app's start.
 * Until then the widget reads as signed out ("Abre Wambito para empezar"), which is the truth: the
 * app has not been opened since the update.
 */
object Migration {
    private const val TAG = "WambitoMigration"
    private const val FILE = "wambito.migration"
    private const val DONE = "fromLukitas"

    /** Old SharedPreferences file to new. */
    private val PREFERENCES = mapOf(
        "lukitas.widget.refresh" to RefreshScheduler.PREFS,
        "lukitas.notices" to NoticeSettings.FILE,
        "lukitas_voice" to WarmHint.FILE,
    )

    private const val OLD_PERIODIC = "lukitas.widget.refresh"
    private const val OLD_MIDNIGHT = "lukitas.widget.midnight"
    private const val OLD_DUE = "lukitas.notice.due"
    private const val OLD_GUEST = "lukitas.notice.guest"

    private fun flags(context: Context) = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    /** Whether it has run on this phone. */
    fun isDone(context: Context): Boolean = flags(context.applicationContext).getBoolean(DONE, false)

    /** Whether the WorkManager half is under way in this process (it finishes asynchronously). */
    private var movingWork = false

    /**
     * Runs the move once; after that, a read of one flag. Process-wide one at a time. The files are
     * moved before it returns, so whatever runs next reads the new ones. The jobs are moved without
     * blocking: a WorkManager job that calls this while WorkManager runs it must not wait on
     * WorkManager's own queue (with its test executors that waits forever). The flag is written once
     * both halves are done.
     */
    @Synchronized
    fun run(context: Context) {
        val app = context.applicationContext
        if (isDone(app) || movingWork) return
        try {
            movePreferences(app)
            movingWork = true
            moveWork(app)
        } catch (e: Exception) {
            // WorkManager not reachable yet, a storage error: tried again at the next start.
            Log.w(TAG, "not finished, tried again later", e)
            movingWork = false
        }
    }

    @Synchronized
    private fun workMoved(app: Context, error: Exception?) {
        movingWork = false
        if (error != null) {
            Log.w(TAG, "jobs not moved, tried again later", error)
            return
        }
        flags(app).edit().putBoolean(DONE, true).commit()
    }

    private fun movePreferences(app: Context) {
        for ((oldName, newName) in PREFERENCES) {
            val old = app.getSharedPreferences(oldName, Context.MODE_PRIVATE)
            val values = old.all
            if (values.isNotEmpty()) {
                val new = app.getSharedPreferences(newName, Context.MODE_PRIVATE)
                if (new.all.isEmpty()) {
                    val editor = new.edit()
                    for ((key, value) in values) {
                        @Suppress("UNCHECKED_CAST")
                        when (value) {
                            is Boolean -> editor.putBoolean(key, value)
                            is Int -> editor.putInt(key, value)
                            is Long -> editor.putLong(key, value)
                            is Float -> editor.putFloat(key, value)
                            is String -> editor.putString(key, value)
                            is Set<*> -> editor.putStringSet(key, value as Set<String>)
                        }
                    }
                    check(editor.commit()) { "$newName not written" }
                }
            }
            // Emptied first: Android keeps the opened file's values in memory after the delete.
            old.edit().clear().commit()
            app.deleteSharedPreferences(oldName)
        }
    }

    private fun moveWork(app: Context) {
        val workManager = WorkManager.getInstance(app)
        val settings = NoticeSettings(app)
        val due = workManager.getWorkInfosForUniqueWork(OLD_DUE)
        val guest = workManager.getWorkInfosForUniqueWork(OLD_GUEST)
        val left = AtomicInteger(2)
        val failed = AtomicReference<Exception?>(null)
        val step = { future: ListenableFuture<List<WorkInfo>>, again: (Duration) -> Unit ->
            future.addListener({
                try {
                    carry(workManager, future.get(), again)
                } catch (e: Exception) {
                    failed.compareAndSet(null, e)
                }
                if (left.decrementAndGet() == 0) {
                    try {
                        workManager.cancelUniqueWork(OLD_PERIODIC)
                        workManager.cancelUniqueWork(OLD_MIDNIGHT)
                        if (RefreshScheduler.hasWidgets(app)) RefreshScheduler.schedule(app)
                    } catch (e: Exception) {
                        failed.compareAndSet(null, e)
                    }
                    workMoved(app, failed.get())
                }
            }, Runnable::run)
        }
        step(due) { delay ->
            if (settings.dueEnabled) NoticeScheduler.enqueueDueIn(app, delay, ExistingWorkPolicy.KEEP)
        }
        step(guest) { delay ->
            if (settings.guestEnabled) NoticeScheduler.enqueueGuestIn(app, delay, ExistingWorkPolicy.KEEP)
        }
    }

    /**
     * Each job of [infos] (an old unique name's) that is waiting: [again] under the new name, as far
     * from now as it was due, then cancelled. A running one is left to finish (see the class comment).
     */
    private fun carry(workManager: WorkManager, infos: List<WorkInfo>, again: (Duration) -> Unit) {
        val now = System.currentTimeMillis()
        for (info in infos) {
            if (info.state != WorkInfo.State.ENQUEUED && info.state != WorkInfo.State.BLOCKED) continue
            val at = info.nextScheduleTimeMillis
            val delay = if (at == Long.MAX_VALUE) 0L else (at - now).coerceAtLeast(0L)
            again(Duration.ofMillis(delay))
            workManager.cancelWorkById(info.id)
        }
    }
}
