package com.wambito.app.capture

import android.content.Context
import androidx.annotation.VisibleForTesting
import androidx.work.BackoffPolicy
import androidx.work.CoroutineWorker
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.wambito.app.notices.ApiResult
import com.wambito.app.notices.serverOf
import com.wambito.app.widget.SecureStorageSession
import com.wambito.app.widget.SessionSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/** What the capture jobs need from outside: the stored session, the API, the queue. */
class CaptureDependencies(
    val session: SessionSource,
    val api: CaptureApi = CaptureApi(),
)

/** Says what a capture did to the person (Task 9 posts the real notifications). */
interface CaptureNotifier {
    /** A capture was saved (or found already saved): ask "¿bien?". */
    fun show(context: Context, answer: CaptureAnswer)

    /** [count] captures wait for a session: "Inicia sesión para guardar 2 gastos detectados". */
    fun signInNeeded(context: Context, count: Int)
}

object CaptureHooks {
    /** Replaced in tests. */
    @VisibleForTesting
    var dependencies: ((Context) -> CaptureDependencies)? = null

    /** Says nothing until the real poster replaces it. */
    @VisibleForTesting
    var notifier: CaptureNotifier = object : CaptureNotifier {
        override fun show(context: Context, answer: CaptureAnswer) = Unit
        override fun signInNeeded(context: Context, count: Int) = Unit
    }

    fun of(context: Context): CaptureDependencies =
        dependencies?.invoke(context) ?: CaptureDependencies(session = SecureStorageSession(context))
}

/** The output key of what a send did, for the logs and the tests. */
const val CAPTURE_OUTCOME = "outcome"

object CaptureScheduler {
    /** Persistent name: never renamed. */
    const val SEND = "wambito.capture.send"

    /** Persistent name for "Bien" (its job comes with the notification). */
    const val CONFIRM = "wambito.capture.confirm"

    private val network = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /**
     * Sends what is queued once there is a network. APPEND_OR_REPLACE: a capture queued while a
     * send runs gets its own run after it, and a failed send never blocks the ones behind it.
     */
    fun enqueueSend(context: Context) {
        val request = OneTimeWorkRequestBuilder<SendCapturesWorker>()
            .setConstraints(network)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(SEND, ExistingWorkPolicy.APPEND_OR_REPLACE, request)
    }
}

/**
 * Sends the queue to `POST /v1/captures`, oldest first (spec sections 2.2 and 5).
 *
 *  * An item leaves the queue only once the server answered it (created, merged) or refused it for
 *    good (a 4xx other than 401). The key travels with the item, so a retry after a crash or a lost
 *    answer saves nothing twice.
 *  * 401 or no session: the queue stays, one "sign in" notice with the count, no retry (the next
 *    capture, or the next sign-in, enqueues a send again).
 *  * Offline or a server error: the queue stays and WorkManager retries with backoff.
 *  * A server setting that cannot be read sends nothing: the token never goes to the default server
 *    in place of the person's.
 *  * Nothing about a capture is logged.
 */
class SendCapturesWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val context = applicationContext
        val dependencies = CaptureHooks.of(context)
        val queue = CaptureQueue(context)
        if (queue.all().isEmpty()) return done("empty")
        val mark = dependencies.session.mark()
        val token = dependencies.session.token()
        if (mark == null || token == null) {
            if (mark == null) CaptureHooks.notifier.signInNeeded(context, queue.all().size)
            return done(if (mark == null) "signed out" else "token unreadable")
        }
        val server = serverOf(context, dependencies.session) ?: return done("server unreadable")
        return withContext(Dispatchers.IO) { sendAll(context, dependencies, queue, server, token, mark) }
    }

    private fun sendAll(
        context: Context,
        dependencies: CaptureDependencies,
        queue: CaptureQueue,
        server: String,
        token: String,
        mark: String,
    ): Result {
        for (item in queue.all()) {
            when (val answer = dependencies.api.send(server, token, item)) {
                is ApiResult.Ok -> {
                    // Signed out (or another account) while the request was on its way: the capture
                    // is saved, but what it says is not for whoever holds the phone now.
                    if (dependencies.session.mark() != mark) {
                        queue.remove(item.key)
                        return done("dropped")
                    }
                    queue.remove(item.key)
                    CaptureHooks.notifier.show(context, answer.value)
                }
                // The server will never take this one: drop it, go on with the rest.
                ApiResult.Rejected -> queue.remove(item.key)
                ApiResult.Unauthorized -> {
                    CaptureHooks.notifier.signInNeeded(context, queue.all().size)
                    return done("session refused")
                }
                ApiResult.Failed -> return Result.retry()
            }
        }
        return done("sent")
    }

    private fun done(outcome: String): Result = Result.success(workDataOf(CAPTURE_OUTCOME to outcome))
}
