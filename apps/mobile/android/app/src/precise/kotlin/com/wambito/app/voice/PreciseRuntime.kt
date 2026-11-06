package com.wambito.app.voice

import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import java.io.File

/**
 * Whether the precise voice model's runtime (sherpa-onnx) is in this build. True here: this file is
 * compiled only without -Pwambito.nativeFromSource (android/app/build.gradle.kts), and naming a
 * sherpa-onnx class makes the build fail if the AAR is not on the classpath.
 */
object PreciseRuntime {
    val linked: Boolean = OfflineRecognizerConfig::class.java.name.isNotEmpty()

    /**
     * Loads the model in the folder [path] for [language] ([PreciseModels.cache]'s opener): Parakeet
     * when it has a joiner ([PreciseModels.kindOf]), Canary otherwise.
     */
    fun open(path: String, language: String, threads: Int): PreciseRecognizer =
        when (PreciseModels.kindOf(File(path))) {
            PreciseKind.PARAKEET -> ParakeetRecognizer(path, threads)
            PreciseKind.CANARY -> CanaryRecognizer(path, language, threads)
        }
}
