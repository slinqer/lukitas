package com.wambito.app.capture

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.work.ListenableWorker
import androidx.work.NetworkType
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.TestListenableWorkerBuilder
import androidx.work.testing.WorkManagerTestInitHelper
import androidx.work.workDataOf
import com.wambito.app.notices.ApiResult
import com.wambito.app.widget.ServerSetting
import com.wambito.app.widget.SessionSource
import com.wambito.app.widget.TinyHttpServer
import com.wambito.app.widget.TinyRequest
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private class FakeSession(var stored: String?, var serverUrl: String?) : SessionSource {
    var serverUnreadable = false
    override fun guest(): Boolean? = null
    override fun token(): String? = stored
    override fun mark(): String? = stored?.let { "mark:$it" }
    override fun server(): ServerSetting = when {
        serverUnreadable -> ServerSetting.Unreadable
        serverUrl == null -> ServerSetting.Default
        else -> ServerSetting.Chosen(serverUrl!!)
    }
}

private class RecordingNotifier : CaptureNotifier {
    val shown = mutableListOf<CaptureAnswer>()
    val signIn = mutableListOf<Int>()
    override fun show(context: Context, answer: CaptureAnswer) {
        shown += answer
    }

    override fun signInNeeded(context: Context, count: Int) {
        signIn += count
    }
}

@RunWith(RobolectricTestRunner::class)
class CaptureWorkersTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private lateinit var server: TinyHttpServer
    private lateinit var session: FakeSession
    private lateinit var queue: CaptureQueue
    private val notifier = RecordingNotifier()
    private val requests = mutableListOf<TinyRequest>()

    /** The status to answer a POST with, by merchant; 201 when absent. */
    private val statusFor = mutableMapOf<String, Int>()
    private var patchStatus = 200
    private var whileAnswering: (() -> Unit)? = null

    private fun answer(merged: Boolean, merchant: String, amount: Long) = """
        {"result":"${if (merged) "merged" else "created"}",
         "transaction":{"id":"t-$merchant","name":"$merchant","amount":-$amount,"currency":"EUR",
           "date":"2026-11-04","status":"posted"},
         "category":{"name":"Supermercado","fallback":false}}
    """.trimIndent()

    @Before
    fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        server = TinyHttpServer { request ->
            requests += request
            whileAnswering?.invoke()
            when {
                request.method == "POST" && request.path.endsWith("/api/v1/captures") -> {
                    val body = JSONObject(request.body)
                    val merchant = body.getString("merchant")
                    val status = statusFor[merchant] ?: 201
                    when {
                        status == 201 || status == 200 -> status to answer(status == 200, merchant, body.getLong("amount"))
                        else -> status to "{}"
                    }
                }
                request.method == "POST" && request.path.endsWith("/api/v1/transactions/review") -> patchStatus to "{}"
                else -> 404 to "{}"
            }
        }
        session = FakeSession("token-1", "http://127.0.0.1:${server.port}")
        queue = CaptureQueue(context)
        CaptureHooks.dependencies = { CaptureDependencies(session = session) }
        CaptureHooks.notifier = notifier
    }

    @After
    fun tearDown() {
        CaptureHooks.dependencies = null
        CaptureHooks.notifier = object : CaptureNotifier {
            override fun show(context: Context, answer: CaptureAnswer) = Unit
            override fun signInNeeded(context: Context, count: Int) = Unit
        }
        server.stop()
        queue.clear()
    }

    private fun runSend(): ListenableWorker.Result = runBlocking {
        TestListenableWorkerBuilder<SendCapturesWorker>(context).build().doWork()
    }

    private fun posts() = requests.filter { it.method == "POST" }

    @Test
    fun `sends and removes on 201`() {
        queue.add(sampleCapture("Mercadona"))

        assertEquals(ListenableWorker.Result.success().javaClass, runSend().javaClass)

        assertTrue(queue.all().isEmpty())
        val answer = notifier.shown.single()
        assertEquals(false, answer.merged)
        assertEquals("t-Mercadona", answer.id)
        assertEquals(-1250L, answer.amountCents)
        assertEquals("Supermercado", answer.categoryName)
        assertEquals(false, answer.isFallback)
    }

    @Test
    fun `sends and removes on 200 merged`() {
        statusFor["Mercadona"] = 200
        queue.add(sampleCapture("Mercadona"))
        runSend()
        assertTrue(queue.all().isEmpty())
        assertEquals(true, notifier.shown.single().merged)
    }

    @Test
    fun `the request is a bearer POST with the key, the background header and exactly six fields`() {
        val item = queue.add(sampleCapture("Mercadona"))
        runSend()

        val request = posts().single()
        assertEquals("/api/v1/captures", request.path)
        assertEquals(item.key, request.headers["idempotency-key"])
        assertEquals("Bearer token-1", request.headers["authorization"])
        assertEquals("1", request.headers["x-wambito-background"])
        val body = JSONObject(request.body)
        assertEquals(setOf("kind", "amount", "currency", "merchant", "capturedAt", "source"), body.keys().asSequence().toSet())
        assertEquals("expense", body.getString("kind"))
        assertEquals(1250L, body.getLong("amount"))
        assertEquals("EUR", body.getString("currency"))
        assertEquals("Mercadona", body.getString("merchant"))
        assertEquals("2026-11-04T12:30:15.123Z", body.getString("capturedAt"))
        assertEquals("revolut", body.getString("source"))
    }

    @Test
    fun `a resend after a crash keeps one item and the same key`() {
        queue.add(sampleCapture("Mercadona"))
        statusFor["Mercadona"] = 500
        assertEquals(ListenableWorker.Result.retry(), runSend())

        // The process died; a new queue instance finds the same single item.
        assertEquals(1, CaptureQueue(context).all().size)
        statusFor.clear()
        runSend()

        assertEquals(2, posts().size)
        assertEquals(posts()[0].headers["idempotency-key"], posts()[1].headers["idempotency-key"])
        assertTrue(queue.all().isEmpty())
    }

    @Test
    fun `unauthorized keeps the queue and asks for one sign-in notice with the count`() {
        statusFor["Mercadona"] = 401
        queue.add(sampleCapture("Mercadona"))
        queue.add(sampleCapture("Café"))

        assertEquals(ListenableWorker.Result.success().javaClass, runSend().javaClass)

        assertEquals(2, queue.all().size)
        assertEquals(listOf(2), notifier.signIn)
        assertEquals(1, posts().size)
        assertTrue(notifier.shown.isEmpty())
    }

    @Test
    fun `signed out sends nothing and asks for sign-in`() {
        session.stored = null
        queue.add(sampleCapture())
        assertEquals(ListenableWorker.Result.success().javaClass, runSend().javaClass)
        assertTrue(requests.isEmpty())
        assertEquals(listOf(1), notifier.signIn)
        assertEquals(1, queue.all().size)
    }

    @Test
    fun `server error retries and keeps the item`() {
        statusFor["Mercadona"] = 503
        queue.add(sampleCapture("Mercadona"))
        assertEquals(ListenableWorker.Result.retry(), runSend())
        assertEquals(1, queue.all().size)
        assertTrue(notifier.shown.isEmpty())
    }

    @Test
    fun `drops a rejected capture and goes on with the next`() {
        statusFor["Broken"] = 422
        queue.add(sampleCapture("Broken"))
        queue.add(sampleCapture("Mercadona"))

        assertEquals(ListenableWorker.Result.success().javaClass, runSend().javaClass)

        assertTrue(queue.all().isEmpty())
        assertEquals(listOf("t-Mercadona"), notifier.shown.map { it.id })
        assertEquals(2, posts().size)
    }

    @Test
    fun `too many requests is not a rejection, it is tried again`() {
        statusFor["Mercadona"] = 429
        queue.add(sampleCapture("Mercadona"))
        assertEquals(ListenableWorker.Result.retry(), runSend())
        assertEquals(1, queue.all().size)
    }

    @Test
    fun `retries when the server lacks the endpoint (404)`() {
        statusFor["Mercadona"] = 404
        queue.add(sampleCapture("Mercadona"))
        assertEquals(ListenableWorker.Result.retry(), runSend())
        assertEquals(1, queue.all().size)
        statusFor["Mercadona"] = 403
        assertEquals(ListenableWorker.Result.retry(), runSend())
        assertEquals(1, queue.all().size)
    }

    @Test
    fun `an unreadable server setting sends nothing, never the token to the default server`() {
        session.serverUnreadable = true
        queue.add(sampleCapture())
        runSend()
        assertTrue(requests.isEmpty())
        assertEquals(1, queue.all().size)
    }

    @Test
    fun `a sign-out while the request is on its way saves nothing on the screen`() {
        queue.add(sampleCapture("Mercadona"))
        val rest = queue.add(sampleCapture("Café"))
        whileAnswering = { session.stored = null }
        runSend()
        assertTrue(notifier.shown.isEmpty())
        // The first was saved by the server, so it left the queue; the rest stayed for a sign-in.
        assertEquals(listOf(rest), queue.all())
        assertEquals(1, posts().size)
    }

    @Test
    fun `the server chosen in Settings is used with any path it has`() {
        session.serverUrl = "http://127.0.0.1:${server.port}/wambito/"
        queue.add(sampleCapture())
        runSend()
        assertEquals("/wambito/api/v1/captures", posts().single().path)
    }

    @Test
    fun `confirm posts the id to the review endpoint`() {
        val result = CaptureApi().confirm("http://127.0.0.1:${server.port}", "token-1", "t-1")
        assertEquals(ApiResult.Ok(Unit), result)
        val request = requests.single()
        assertEquals("POST", request.method)
        assertEquals("/api/v1/transactions/review", request.path)
        assertEquals("""{"ids":["t-1"]}""", request.body)
        assertEquals("1", request.headers["x-wambito-background"])
    }

    @Test
    fun `confirm tells a refused session apart`() {
        patchStatus = 401
        assertEquals(ApiResult.Unauthorized, CaptureApi().confirm("http://127.0.0.1:${server.port}", "t", "t-1"))
        patchStatus = 500
        assertEquals(ApiResult.Failed, CaptureApi().confirm("http://127.0.0.1:${server.port}", "t", "t-1"))
    }

    private fun runConfirm(id: String = "t-1"): ListenableWorker.Result = runBlocking {
        TestListenableWorkerBuilder<ConfirmCaptureWorker>(context)
            .setInputData(workDataOf(ConfirmCaptureWorker.ID to id))
            .build()
            .doWork()
    }

    private fun notifications() = context.getSystemService(android.app.NotificationManager::class.java)

    private fun showOne() = CapturePoster.show(context, CaptureAnswer(false, "t-1", -1250, "EUR", "Mercadona", "Supermercado", false))

    @Test
    fun `confirm posts to the review endpoint and cancels the notification`() {
        showOne()
        assertEquals(1, notifications().activeNotifications.size)

        assertEquals(ListenableWorker.Result.success().javaClass, runConfirm().javaClass)

        assertEquals("""{"ids":["t-1"]}""", requests.single().body)
        assertEquals("Bearer token-1", requests.single().headers["authorization"])
        assertTrue(notifications().activeNotifications.isEmpty())
    }

    @Test
    fun `confirm retries on failure and keeps the notification`() {
        showOne()
        patchStatus = 500
        assertEquals(ListenableWorker.Result.retry(), runConfirm())
        assertEquals(1, notifications().activeNotifications.size)
    }

    @Test
    fun `confirm with a refused session or none keeps the notification and does not retry`() {
        showOne()
        patchStatus = 401
        assertEquals(ListenableWorker.Result.success().javaClass, runConfirm().javaClass)
        assertEquals(1, notifications().activeNotifications.size)
        session.stored = null
        requests.clear()
        assertEquals(ListenableWorker.Result.success().javaClass, runConfirm().javaClass)
        assertTrue(requests.isEmpty())
        assertEquals(1, notifications().activeNotifications.size)
    }

    @Test
    fun `confirm without an id or with an unreadable server sends nothing`() {
        assertEquals(ListenableWorker.Result.success().javaClass, runConfirm("").javaClass)
        session.serverUnreadable = true
        runConfirm()
        assertTrue(requests.isEmpty())
    }

    @Test
    fun `the confirm is a unique job that appends, carries the id and waits for a network`() {
        CaptureScheduler.enqueueConfirm(context, "t-1")
        CaptureScheduler.enqueueConfirm(context, "t-2")

        val jobs = WorkManager.getInstance(context).getWorkInfosForUniqueWork(CaptureScheduler.CONFIRM).get()
        assertEquals(2, jobs.size)
        assertTrue(jobs.all { it.constraints.requiredNetworkType == NetworkType.CONNECTED })
    }

    @Test
    fun `the send is a unique job that appends, waits for a network and backs off exponentially`() {
        CaptureScheduler.enqueueSend(context)
        CaptureScheduler.enqueueSend(context)

        val jobs = WorkManager.getInstance(context).getWorkInfosForUniqueWork(CaptureScheduler.SEND).get()
        assertEquals(2, jobs.size)
        assertTrue(jobs.all { it.constraints.requiredNetworkType == NetworkType.CONNECTED })
        assertEquals(1, jobs.count { it.state == WorkInfo.State.ENQUEUED })
    }
}
