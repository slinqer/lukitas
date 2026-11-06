package com.wambito.app.voice

import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import java.io.File
import java.util.concurrent.Executors

/**
 * The precise voice model (NVIDIA Canary for es/en, Parakeet for it/pt, run by sherpa-onnx): it
 * re-transcribes the whole recording when the person lets go ([Refine]). Only its shape lives here;
 * the sherpa-onnx implementations, `CanaryRecognizer` and `ParakeetRecognizer`, are in `src/precise`
 * (Play and GitHub builds), and the F-Droid build, without sherpa-onnx, has a [PreciseRuntime]
 * whose `open` throws.
 */
interface PreciseRecognizer : AutoCloseable {
    /** The text said in [samples] (mono, -1..1), with punctuation. */
    fun transcribe(samples: FloatArray, sampleRate: Int): String
}

/** Which precise model a folder holds ([PreciseModels.kindOf]). */
enum class PreciseKind { CANARY, PARAKEET }

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

    /** Parakeet (a transducer) is the only one with a joiner; Canary has an encoder and a decoder. */
    fun kindOf(folder: File): PreciseKind =
        if (File(folder, "joiner.int8.onnx").exists()) PreciseKind.PARAKEET else PreciseKind.CANARY

    /**
     * Whether this phone gets the precise model: sherpa-onnx is in the build, the phone is arm64,
     * has at least [minRam] of RAM (never below 3 GB; Parakeet asks for [PARAKEET_MIN_RAM]) and is
     * not a low-RAM (Android Go) device (spec §3).
     */
    fun available(context: Context, minRam: Long = MIN_RAM): Boolean {
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memory = ActivityManager.MemoryInfo().also { manager.getMemoryInfo(it) }
        return qualifies(
            linked = linked(),
            abis = Build.SUPPORTED_64_BIT_ABIS,
            totalMem = memory.totalMem,
            lowRam = manager.isLowRamDevice,
            minRam = minRam,
        )
    }

    internal fun qualifies(
        linked: Boolean,
        abis: Array<String>,
        totalMem: Long,
        lowRam: Boolean,
        minRam: Long = MIN_RAM,
    ): Boolean = linked && "arm64-v8a" in abis && totalMem >= maxOf(minRam, MIN_RAM) && !lowRam

    private fun linked(): Boolean = try {
        PreciseRuntime.linked
    } catch (_: Throwable) {
        false
    }

    const val MIN_RAM = 3L * 1024 * 1024 * 1024

    /**
     * Parakeet's floor: it takes ~765 MB loaded, so phones sold as 6 GB (which report about
     * 5.5 GiB) and up. The Dart side asks for it through `deviceQualifies`' `minRamBytes`.
     */
    const val PARAKEET_MIN_RAM = 5L * 1024 * 1024 * 1024

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
