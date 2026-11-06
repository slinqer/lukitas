package com.wambito.app.voice

import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineTransducerModelConfig

/**
 * NVIDIA Parakeet TDT 0.6B v3 (sherpa-onnx's int8 export: `encoder.int8.onnx`, `decoder.int8.onnx`,
 * `joiner.int8.onnx`, `tokens.txt` in the folder [path]), used for Italian and Portuguese. It finds
 * the language itself and writes punctuation, so it takes none. Kept by [PreciseModels.cache]; not
 * thread-safe, like [CanaryRecognizer].
 */
class ParakeetRecognizer(path: String, threads: Int = PreciseModels.THREADS) : PreciseRecognizer {

    private val recognizer = OfflineRecognizer(
        assetManager = null,
        config = OfflineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = PcmBuffer.SAMPLE_RATE, featureDim = 80),
            modelConfig = OfflineModelConfig(
                transducer = OfflineTransducerModelConfig(
                    encoder = "$path/encoder.int8.onnx",
                    decoder = "$path/decoder.int8.onnx",
                    joiner = "$path/joiner.int8.onnx",
                ),
                tokens = "$path/tokens.txt",
                modelType = "nemo_transducer",
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
