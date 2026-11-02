// 2b: remove (with Migration.kt): once every phone has opened a Wambito build.
package com.wambito.app

import android.content.Context
import android.os.Looper
import androidx.test.core.app.ApplicationProvider
import androidx.work.BackoffPolicy
import androidx.work.Configuration
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.testing.WorkManagerTestInitHelper
import com.wambito.app.notices.DueWorker
import com.wambito.app.notices.GuestWorker
import com.wambito.app.notices.NOTICE_OUTCOME
import com.wambito.app.notices.NoticeDependencies
import com.wambito.app.notices.NoticeHooks
import com.wambito.app.notices.NoticeScheduler
import com.wambito.app.notices.NoticeSettings
import com.wambito.app.widget.RefreshScheduler
import com.wambito.app.widget.RefreshWorker
import com.wambito.app.widget.ServerSetting
import com.wambito.app.widget.SessionSource
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import java.io.File
import java.time.Duration
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RunWith(RobolectricTestRunner::class)
class MigrationTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val workManager get() = WorkManager.getInstance(context)

    @Before
    fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
    }

    @After
    fun tearDown() {
        NoticeHooks.dependencies = null
        Migration.beforeCarry = null
    }

    private fun old(name: String) = context.getSharedPreferences(name, Context.MODE_PRIVATE)

    private fun prefsFile(name: String) = File(context.dataDir, "shared_prefs/$name.xml")

    private fun active(name: String) = workManager.getWorkInfosForUniqueWork(name).get().filter { !it.state.isFinished }

    // --- SharedPreferences ---------------------------------------------------------------------

    @Test
    fun `prefs carried over - the old files' values are in the new ones, and the old files are gone`() {
        old("lukitas.notices").edit()
            .putBoolean("due", true)
            .putBoolean("guest", true)
            .putString("zone", "America/Bogota")
            .putString("language", "es")
            .putString("lastDueDay", "2026-11-01")
            .commit()
        old("lukitas.widget.refresh").edit().putString("midnightZone", "America/Bogota").commit()
        old("lukitas_voice").edit().putString("warm_model_path", "/data/models/es").commit()

        Migration.run(context)

        val settings = NoticeSettings(context)
        assertTrue(settings.dueEnabled)
        assertTrue(settings.guestEnabled)
        assertEquals("America/Bogota", settings.zone)
        assertEquals("es", settings.language)
        assertEquals("2026-11-01", settings.lastDueDay)
        assertEquals(
            mapOf("midnightZone" to "America/Bogota"),
            context.getSharedPreferences("wambito.widget.refresh", Context.MODE_PRIVATE).all,
        )
        assertEquals(
            mapOf("warm_model_path" to "/data/models/es"),
            context.getSharedPreferences("wambito_voice", Context.MODE_PRIVATE).all,
        )
        for (name in listOf("lukitas.notices", "lukitas.widget.refresh", "lukitas_voice")) {
            assertFalse("$name is deleted", prefsFile(name).exists())
            assertTrue("$name holds nothing", old(name).all.isEmpty())
        }
    }

    @Test
    fun `a new file that already holds values wins, and the old one goes all the same`() {
        old("lukitas.notices").edit().putString("language", "es").commit()
        NoticeSettings(context).language = "en"

        Migration.run(context)

        assertEquals("en", NoticeSettings(context).language)
        assertTrue(old("lukitas.notices").all.isEmpty())
        assertFalse(prefsFile("lukitas.notices").exists())
    }

    @Test
    fun `the widget snapshot is not Kotlin's to move - Dart's migrate_keys moves it in the same file`() {
        val homeWidget = context.getSharedPreferences("HomeWidgetPreferences", Context.MODE_PRIVATE)
        homeWidget.edit().putString("lukitas.widget.snapshot", "{}").commit()

        Migration.run(context)

        assertEquals(mapOf("lukitas.widget.snapshot" to "{}"), homeWidget.all)
    }

    // --- WorkManager ---------------------------------------------------------------------------

    private val network = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    @Test
    fun `old unique work cancelled - only the new names remain, at the time the old ones were due`() {
        NoticeSettings(context).apply {
            dueEnabled = true
            guestEnabled = true
        }
        val dueIn = Duration.ofHours(3)
        val guestIn = Duration.ofDays(10)
        workManager.enqueueUniqueWork(
            "lukitas.notice.due",
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<DueWorker>().setInitialDelay(dueIn).setConstraints(network).build(),
        )
        workManager.enqueueUniqueWork(
            "lukitas.notice.guest",
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<GuestWorker>().setInitialDelay(guestIn).build(),
        )
        workManager.enqueueUniquePeriodicWork(
            "lukitas.widget.refresh",
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<RefreshWorker>(Duration.ofHours(3)).setInitialDelay(Duration.ofHours(1)).build(),
        )
        workManager.enqueueUniqueWork(
            "lukitas.widget.midnight",
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<RefreshWorker>().setInitialDelay(Duration.ofHours(5)).build(),
        )

        Migration.run(context)

        for (name in listOf("lukitas.notice.due", "lukitas.notice.guest", "lukitas.widget.refresh", "lukitas.widget.midnight")) {
            assertEquals("$name is cancelled", emptyList<WorkInfo>(), active(name))
        }
        assertEquals("wambito.notice.due", NoticeScheduler.DUE)
        assertEquals("wambito.notice.guest", NoticeScheduler.GUEST)
        val due = active(NoticeScheduler.DUE).single()
        assertNear(dueIn, due.initialDelayMillis)
        assertEquals(NetworkType.CONNECTED, due.constraints.requiredNetworkType)
        assertNear(guestIn, active(NoticeScheduler.GUEST).single().initialDelayMillis)
        // No widget is on the home screen (the renamed receivers took the old ones away): no refresh.
        assertEquals("wambito.widget.refresh", RefreshScheduler.PERIODIC)
        assertEquals("wambito.widget.midnight", RefreshScheduler.MIDNIGHT)
        assertEquals(emptyList<WorkInfo>(), active(RefreshScheduler.PERIODIC))
        assertEquals(emptyList<WorkInfo>(), active(RefreshScheduler.MIDNIGHT))
    }

    @Test
    fun `old notice work with its switch off is cancelled and not carried over`() {
        workManager.enqueueUniqueWork(
            "lukitas.notice.due",
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<DueWorker>().setInitialDelay(Duration.ofHours(3)).build(),
        )

        Migration.run(context)

        assertEquals(emptyList<WorkInfo>(), active("lukitas.notice.due"))
        assertEquals(emptyList<WorkInfo>(), active(NoticeScheduler.DUE))
    }

    @Test
    fun `an old-named notice job that is running is left to finish, so it neither stops halfway nor runs twice`() {
        NoticeSettings(context).dueEnabled = true
        NoticeHooks.dependencies = { NoticeDependencies(session = SignedOut) }
        val request = OneTimeWorkRequestBuilder<DueWorker>().build()
        workManager.enqueueUniqueWork("lukitas.notice.due", ExistingWorkPolicy.REPLACE, request)
        // The job ran (it calls Migration first): it ends as it would have, not cancelled.
        val info = workManager.getWorkInfoById(request.id).get()!!
        assertEquals(WorkInfo.State.SUCCEEDED, info.state)
        assertEquals("signed out", info.outputData.getString(NOTICE_OUTCOME))
        // Nothing was carried over next to it: a signed-out person gets no next run.
        assertEquals(emptyList<WorkInfo>(), active(NoticeScheduler.DUE))
        assertTrue(Migration.isDone(context))
    }

    @Test
    fun `moving the jobs fails - the flag stays unset, the old job stays, and the next start finishes it`() {
        NoticeSettings(context).guestEnabled = true
        workManager.enqueueUniqueWork(
            "lukitas.notice.guest",
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<GuestWorker>().setInitialDelay(Duration.ofDays(3)).build(),
        )
        Migration.beforeCarry = { throw IllegalStateException("WorkManager said no") }

        Migration.run(context)

        assertFalse(Migration.isDone(context))
        assertEquals(1, active("lukitas.notice.guest").size)
        assertEquals(emptyList<WorkInfo>(), active(NoticeScheduler.GUEST))

        Migration.beforeCarry = null
        Migration.run(context)

        assertTrue(Migration.isDone(context))
        assertEquals(emptyList<WorkInfo>(), active("lukitas.notice.guest"))
        assertEquals(1, active(NoticeScheduler.GUEST).size)
    }

    @Test
    fun `runs once`() {
        Migration.run(context)
        assertTrue(Migration.isDone(context))

        old("lukitas.notices").edit().putString("language", "es").commit()
        workManager.enqueueUniqueWork(
            "lukitas.notice.guest",
            ExistingWorkPolicy.REPLACE,
            OneTimeWorkRequestBuilder<GuestWorker>().setInitialDelay(Duration.ofDays(3)).build(),
        )
        Migration.run(context)

        assertEquals(mapOf("language" to "es"), old("lukitas.notices").all)
        assertEquals(1, active("lukitas.notice.guest").size)
        assertEquals(null, NoticeSettings(context).language)
    }

    private fun assertNear(expected: Duration, actualMillis: Long) {
        val slack = Duration.ofSeconds(30).toMillis()
        assertTrue(
            "$actualMillis ms is not about ${expected.toMillis()} ms",
            actualMillis in (expected.toMillis() - slack)..expected.toMillis(),
        )
    }

    private object SignedOut : SessionSource {
        override fun token(): String? = null
        override fun mark(): String? = null
        override fun server(): ServerSetting = ServerSetting.Default
    }
}

/**
 * A job still running under an old name when Migration looks, on WorkManager's real threads (the
 * synchronous test executors only answer once the job has ended, so they never show one running).
 */
@RunWith(RobolectricTestRunner::class)
class MigrationRunningJobTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private val workManager get() = WorkManager.getInstance(context)

    @Before
    fun setUp() {
        WorkManagerTestInitHelper.initializeTestWorkManager(
            context,
            Configuration.Builder().setExecutor(Executors.newSingleThreadExecutor()).build(),
            WorkManagerTestInitHelper.ExecutorsMode.PRESERVE_EXECUTORS,
        )
        HeldWorker.started = CountDownLatch(1)
        HeldWorker.release = CountDownLatch(1)
    }

    @After
    fun tearDown() {
        HeldWorker.release.countDown()
    }

    private fun waitUntil(what: String, check: () -> Boolean) {
        val until = System.currentTimeMillis() + 10_000
        while (!check()) {
            assertTrue("timed out waiting for $what", System.currentTimeMillis() < until)
            // Robolectric's main looper is paused: whatever WorkManager posts to it runs here.
            shadowOf(Looper.getMainLooper()).idle()
            Thread.sleep(20)
        }
    }

    private fun state(id: java.util.UUID) = workManager.getWorkInfoById(id).get()?.state

    private fun active(name: String) = workManager.getWorkInfosForUniqueWork(name).get().filter { !it.state.isFinished }

    @Test
    fun `an old job running keeps the flag unset, and once it is back for a retry the next run moves it`() {
        NoticeSettings(context).dueEnabled = true
        val request = OneTimeWorkRequestBuilder<HeldWorker>()
            .setBackoffCriteria(BackoffPolicy.LINEAR, Duration.ofMinutes(10))
            .build()
        workManager.enqueueUniqueWork("lukitas.notice.due", ExistingWorkPolicy.REPLACE, request)
        waitUntil("the job to start") { HeldWorker.started.count == 0L }
        assertEquals(WorkInfo.State.RUNNING, state(request.id))

        Migration.run(context)
        waitUntil("the jobs half") { Migration.idle() }

        assertFalse("looked at again while it runs", Migration.isDone(context))
        assertEquals(WorkInfo.State.RUNNING, state(request.id))
        assertEquals(emptyList<WorkInfo>(), active(NoticeScheduler.DUE))

        // It asks to be retried: back under the old name, waiting.
        HeldWorker.release.countDown()
        waitUntil("the retry") { state(request.id) == WorkInfo.State.ENQUEUED }

        Migration.run(context)
        waitUntil("the jobs half") { Migration.idle() }

        assertTrue(Migration.isDone(context))
        assertEquals(emptyList<WorkInfo>(), active("lukitas.notice.due"))
        assertEquals(1, active(NoticeScheduler.DUE).size)
    }
}

/** A job that runs until the test lets it go, then asks to be retried. */
class HeldWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        started.countDown()
        release.await(10, TimeUnit.SECONDS)
        return Result.retry()
    }

    companion object {
        lateinit var started: CountDownLatch
        lateinit var release: CountDownLatch
    }
}
