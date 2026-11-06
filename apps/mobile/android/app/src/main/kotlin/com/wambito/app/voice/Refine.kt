package com.wambito.app.voice

/** What the re-transcription on release gave. */
sealed class RefineResult {
    data class Text(val text: String) : RefineResult()

    /** `timeout` (the model was not loaded within the limit) or `failed`. */
    data class Failed(val code: String) : RefineResult()

    /** Nothing to send: no audio was read, or the listen was cancelled. */
    object Skipped : RefineResult()
}

/**
 * The re-transcription of a whole recording by the precise model when the person lets go (spec
 * §4.2). Waits for a model that is still loading (the person can let go before Canary is up, about
 * 1.3 s on a cold start) up to [limitMs], holds a lease while it transcribes so a drop meanwhile
 * closes the model only afterwards, and frees the audio when done. Runs on the caller's thread.
 */
class Refine(
    private val cache: ModelCache<PreciseRecognizer>,
    private val limitMs: Long = 3000,
) {
    fun run(key: String, buffer: PcmBuffer, cancelled: () -> Boolean): RefineResult {
        try {
            if (buffer.isEmpty || cancelled()) return RefineResult.Skipped
            val deadline = System.nanoTime() + limitMs * 1_000_000
            val lease = cache.acquire(key) { cancelled() || System.nanoTime() >= deadline }
                ?: return if (cancelled()) RefineResult.Skipped else RefineResult.Failed("timeout")
            return lease.use {
                val samples = buffer.toFloats()
                buffer.clear()
                val text = it.model.transcribe(samples, PcmBuffer.SAMPLE_RATE)
                if (cancelled()) RefineResult.Skipped else RefineResult.Text(text)
            }
        } catch (_: Throwable) {
            return if (cancelled()) RefineResult.Skipped else RefineResult.Failed("failed")
        } finally {
            buffer.clear()
        }
    }
}
