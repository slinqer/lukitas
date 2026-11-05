package com.wambito.app.voice

import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineCanaryModelConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig

/**
 * NVIDIA Canary (sherpa-onnx's int8 export: `encoder.int8.onnx`, `decoder.int8.onnx`, `tokens.txt`
 * in the folder [path]), source and target language [language], punctuation on. Loading takes about
 * 1.3 s, so it is kept by [PreciseModels.cache]. Not thread-safe: one transcription at a time, which
 * VoiceChannel's single worker guarantees.
 */
class CanaryRecognizer(path: String, language: String, threads: Int = PreciseModels.THREADS) :
    PreciseRecognizer {

    private val recognizer = OfflineRecognizer(
        assetManager = null,
        config = OfflineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = PcmBuffer.SAMPLE_RATE, featureDim = 80),
            modelConfig = OfflineModelConfig(
                canary = OfflineCanaryModelConfig(
                    encoder = "$path/encoder.int8.onnx",
                    decoder = "$path/decoder.int8.onnx",
                    srcLang = language,
                    tgtLang = language,
                    usePnc = true,
                ),
                tokens = "$path/tokens.txt",
                numThreads = threads,
                provider = "cpu",
                debug = false,
            ),
        ),
    )

    override fun transcribe(samples: FloatArray, sampleRate: Int): String {
        val stream = recognizer.createStream()
        try {
            stream.acceptWaveform(samples, sampleRate)
            recognizer.decode(stream)
            return recognizer.getResult(stream).text.trim()
        } finally {
            stream.release()
        }
    }

    override fun close() {
        recognizer.release()
    }
}
