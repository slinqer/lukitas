package com.wambito.app.voice

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/** The re-transcription on release (voice/Refine.kt), on a stand-in for Canary: no native library. */
class RefineTest {
    /** A "Canary": returns [text], records what it was given and when it was closed. */
    private inner class Fake(val key: String) : PreciseRecognizer {
        val transcribed = AtomicInteger()
        @Volatile var closedWhileTranscribing = false
        @Volatile var closed = false
        @Volatile var busy = false

        override fun transcribe(samples: FloatArray, sampleRate: Int): String {
            busy = true
            try {
                transcribed.incrementAndGet()
                lastSamples = samples.size
                lastRate = sampleRate
                duringTranscribe?.invoke()
                failWith?.let { throw it }
                return text
            } finally {
                busy = false
            }
        }

        override fun close() {
            if (busy) closedWhileTranscribing = true
            closed = true
        }
    }

    private var text = "Dos euros en café."
    private var loadMs = 0L
    private var gate: CountDownLatch? = null
    private var failWith: Throwable? = null
    private var duringTranscribe: (() -> Unit)? = null
    @Volatile private var lastSamples = -1
    @Volatile private var lastRate = -1
    private val opened = mutableListOf<Fake>()
    private val executor = Executors.newSingleThreadExecutor()

    private val cache = ModelCache<PreciseRecognizer>(
        open = { key ->
            if (loadMs > 0) Thread.sleep(loadMs)
            gate?.await(10, TimeUnit.SECONDS)
            Fake(key).also { synchronized(opened) { opened += it } }
        },
        loader = executor,
    )

    private val key = PreciseModels.key("/models/canary", "es")

    private fun spoken(): PcmBuffer = PcmBuffer().apply { append(ShortArray(32_000) { 1000 }) }

    @After
    fun tearDown() {
        gate?.countDown()
        executor.shutdownNow()
    }

    @Test
    fun `refine returns the recognizer's text`() {
        cache.warm(key).get(5, TimeUnit.SECONDS)
        val buffer = spoken()
        val result = Refine(cache).run(key, buffer) { false }
        assertEquals(RefineResult.Text("Dos euros en café."), result)
        assertEquals(32_000, lastSamples)
        assertEquals(16_000, lastRate)
        assertTrue("the audio is freed after the refine", buffer.isEmpty)
    }

    @Test
    fun `no refine when no audio was read`() {
        cache.warm(key).get(5, TimeUnit.SECONDS)
        val result = Refine(cache).run(key, PcmBuffer()) { false }
        assertEquals(RefineResult.Skipped, result)
        assertEquals(0, opened.single().transcribed.get())
    }

    @Test
    fun `refine waits for a loading model`() {
        loadMs = 1000
        cache.warm(key) // The person lets go before Canary has loaded.
        val result = Refine(cache, limitMs = 3000).run(key, spoken()) { false }
        assertEquals(RefineResult.Text("Dos euros en café."), result)
    }

    @Test
    fun `refine gives up after the limit`() {
        gate = CountDownLatch(1) // The load would take 4 s: it is let go only after the limit.
        cache.warm(key)
        val started = System.nanoTime()
        val buffer = spoken()
        val result = Refine(cache, limitMs = 3000).run(key, buffer) { false }
        val tookMs = (System.nanoTime() - started) / 1_000_000
        assertEquals(RefineResult.Failed("timeout"), result)
        assertTrue("gave up at the limit, took $tookMs ms", tookMs in 3000..5000)
        assertTrue(buffer.isEmpty)
    }

    @Test
    fun `recognizer is keyed by path and language`() {
        assertEquals("/models/canary#es", key)
        cache.warm(key).get(5, TimeUnit.SECONDS)
        val english = PreciseModels.key("/models/canary", "en")
        val result = Refine(cache).run(english, spoken()) { false }
        assertEquals(RefineResult.Text("Dos euros en café."), result)
        assertEquals(listOf(key, english), opened.map { it.key })
        assertEquals(0, opened[0].transcribed.get())
        assertEquals(1, opened[1].transcribed.get())
    }

    @Test
    fun `drop during refine closes after release`() {
        cache.warm(key).get(5, TimeUnit.SECONDS)
        duringTranscribe = { cache.drop() } // Memory pressure, or the models deleted.
        val result = Refine(cache).run(key, spoken()) { false }
        assertEquals(RefineResult.Text("Dos euros en café."), result)
        val fake = opened.single()
        assertEquals(false, fake.closedWhileTranscribing)
        assertTrue("closed once the refine let go", fake.closed)
    }

    @Test
    fun `cancel during refine sends nothing`() {
        cache.warm(key).get(5, TimeUnit.SECONDS)
        val cancelled = AtomicBoolean(false)
        duringTranscribe = { cancelled.set(true) } // The sheet closed while Canary ran.
        val buffer = spoken()
        val result = Refine(cache).run(key, buffer) { cancelled.get() }
        assertEquals(RefineResult.Skipped, result)
        assertTrue(buffer.isEmpty)
    }

    @Test
    fun `cancel while waiting for the model sends nothing`() {
        gate = CountDownLatch(1)
        cache.warm(key)
        val started = System.nanoTime()
        val result = Refine(cache).run(key, spoken()) { System.nanoTime() - started > 100_000_000 }
        assertEquals(RefineResult.Skipped, result)
    }

    @Test
    fun `a recognizer that throws gives Failed("failed")`() {
        cache.warm(key).get(5, TimeUnit.SECONDS)
        failWith = IllegalStateException("onnx")
        val buffer = spoken()
        val result = Refine(cache).run(key, buffer) { false }
        assertEquals(RefineResult.Failed("failed"), result)
        assertTrue(buffer.isEmpty)
    }

    @Test
    fun `a model that cannot be opened gives Failed("failed")`() {
        val broken = ModelCache<PreciseRecognizer>(
            open = { throw UnsupportedOperationException("no sherpa-onnx") },
            loader = executor,
        )
        assertEquals(RefineResult.Failed("failed"), Refine(broken).run(key, spoken()) { false })
    }

    @Test
    fun `a device qualifies only with arm64, 3 GB and not low-RAM`() {
        val gb = 1024L * 1024 * 1024
        assertTrue(PreciseModels.qualifies(true, arrayOf("arm64-v8a"), 3 * gb, false))
        assertEquals(false, PreciseModels.qualifies(false, arrayOf("arm64-v8a"), 8 * gb, false))
        assertEquals(false, PreciseModels.qualifies(true, arrayOf("x86_64"), 8 * gb, false))
        assertEquals(false, PreciseModels.qualifies(true, emptyArray(), 8 * gb, false))
        assertEquals(false, PreciseModels.qualifies(true, arrayOf("arm64-v8a"), 3 * gb - 1, false))
        assertEquals(false, PreciseModels.qualifies(true, arrayOf("arm64-v8a"), 8 * gb, true))
    }
}
