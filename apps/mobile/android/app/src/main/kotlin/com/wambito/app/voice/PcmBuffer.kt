package com.wambito.app.voice

/**
 * The recording of one listen, kept in memory for the precise model's re-transcription on release
 * ([Refine]): the 16 kHz mono PCM16 chunks VoiceChannel reads, up to 30 s (the longest listen,
 * `longestListen` in Dart), at most ~960 KB. It lives only for the recording and is cleared after the
 * refine; it is never written to disk, sent, or logged.
 */
class PcmBuffer(private val capacity: Int = MAX_SAMPLES) {
    private val chunks = ArrayList<ShortArray>()
    private var size = 0

    val isEmpty: Boolean get() = size == 0

    /** Keeps the first [count] samples of [samples] (a copy), as long as there is room. */
    fun append(samples: ShortArray, count: Int = samples.size) {
        val kept = minOf(count, capacity - size)
        if (kept <= 0) return
        chunks += samples.copyOf(kept)
        size += kept
    }

    /** All the samples kept, as floats in -1..1 (sample / 32768), the precise model's input. */
    fun toFloats(): FloatArray {
        val out = FloatArray(size)
        var at = 0
        for (chunk in chunks) {
            for (sample in chunk) out[at++] = sample / 32768f
        }
        return out
    }

    fun clear() {
        chunks.clear()
        size = 0
    }

    companion object {
        const val SAMPLE_RATE = 16_000

        /** 30 s at 16 kHz. */
        const val MAX_SAMPLES = 30 * SAMPLE_RATE
    }
}
