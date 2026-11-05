package com.wambito.app.voice

import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import java.util.concurrent.Executors

/**
 * The precise voice model (NVIDIA Canary, run by sherpa-onnx): it re-transcribes the whole recording
 * when the person lets go ([Refine]). Only its shape lives here; the sherpa-onnx implementation,
 * `CanaryRecognizer`, is in `src/precise` (Play and GitHub builds), and the F-Droid build, without
 * sherpa-onnx, has a [PreciseRuntime] whose `open` throws.
 */
interface PreciseRecognizer : AutoCloseable {
    /** The text said in [samples] (mono, -1..1), with punctuation. */
    fun transcribe(samples: FloatArray, sampleRate: Int): String
}

/**
 * The process's precise recognizer, kept loaded like Vosk's model ([VoiceModels]): a second
 * [ModelCache], keyed by model folder and language ([key]) since Canary's source and target language
 * are fixed when it is opened. Freed on memory pressure and by VoiceChannel's `releaseModels`.
 */
object PreciseModels {
    /** Canary's threads: the spike took ~0.13 s per 2 s phrase with 6 on a recent phone. */
    const val THREADS = 4

    val cache = ModelCache<PreciseRecognizer>(
        open = { key ->
            val split = key.lastIndexOf('#')
            PreciseRuntime.open(key.substring(0, split), key.substring(split + 1), THREADS)
        },
        loader = Executors.newSingleThreadExecutor { runnable ->
            Thread(runnable, "wambito-precise-model").apply {
                isDaemon = true
                priority = Thread.NORM_PRIORITY - 1
            }
        },
    )

    fun key(path: String, language: String) = "$path#$language"

    /**
     * Whether this phone gets the precise model: sherpa-onnx is in the build, the phone is arm64,
     * has at least 3 GB of RAM and is not a low-RAM (Android Go) device (spec §3).
     */
    fun available(context: Context): Boolean {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memory = ActivityManager.MemoryInfo().also { manager.getMemoryInfo(it) }
        return qualifies(
            linked = linked(),
            abis = Build.SUPPORTED_64_BIT_ABIS,
            totalMem = memory.totalMem,
            lowRam = manager.isLowRamDevice,
        )
    }

    internal fun qualifies(linked: Boolean, abis: Array<String>, totalMem: Long, lowRam: Boolean): Boolean =
        linked && "arm64-v8a" in abis && totalMem >= MIN_RAM && !lowRam

    private fun linked(): Boolean = try {
        PreciseRuntime.linked
    } catch (_: Throwable) {
        false
    }

    private const val MIN_RAM = 3L * 1024 * 1024 * 1024

    private var registered = false

    /** Starts listening to memory pressure for the whole process, once (as [VoiceModels.register]). */
    @Synchronized
    fun register(context: Context) {
        if (registered) return
        registered = true
        context.applicationContext.registerComponentCallbacks(object : ComponentCallbacks2 {
            override fun onTrimMemory(level: Int) {
                if (VoiceModels.shouldReleaseOnTrim(level)) cache.drop()
            }

            override fun onConfigurationChanged(newConfig: Configuration) {}

            @Deprecated("Deprecated in Java")
            override fun onLowMemory() {
                cache.drop()
            }
        })
    }
}
