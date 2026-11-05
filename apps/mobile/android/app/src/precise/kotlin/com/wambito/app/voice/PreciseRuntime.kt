package com.wambito.app.voice

import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig

/**
 * Whether the precise voice model's runtime (sherpa-onnx) is in this build. True here: this file is
 * compiled only without -Pwambito.nativeFromSource (android/app/build.gradle.kts), and naming a
 * sherpa-onnx class makes the build fail if the AAR is not on the classpath.
 */
object PreciseRuntime {
    val linked: Boolean = OfflineRecognizerConfig::class.java.name.isNotEmpty()
}
