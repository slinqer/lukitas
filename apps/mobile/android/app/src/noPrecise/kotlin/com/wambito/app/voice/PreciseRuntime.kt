package com.wambito.app.voice

/**
 * Whether the precise voice model's runtime (sherpa-onnx) is in this build. False here: this file is
 * compiled only with -Pwambito.nativeFromSource=true, the F-Droid build, which does not take the AAR.
 */
object PreciseRuntime {
    val linked: Boolean = false
}
