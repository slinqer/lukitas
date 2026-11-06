package com.wambito.app.voice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** The recording kept in memory for the precise model (voice/PcmBuffer.kt). */
class PcmBufferTest {
    @Test
    fun `two chunks become one run of floats`() {
        val buffer = PcmBuffer()
        assertTrue(buffer.isEmpty)
        buffer.append(ShortArray(640) { Short.MAX_VALUE })
        buffer.append(ShortArray(640) { Short.MIN_VALUE })
        val floats = buffer.toFloats()
        assertFalse(buffer.isEmpty)
        assertEquals(1280, floats.size)
        assertEquals(32767 / 32768f, floats[0], 0f)
        assertEquals(-1f, floats[1279], 0f)
    }

    @Test
    fun `only the samples read count`() {
        val buffer = PcmBuffer()
        buffer.append(ShortArray(640) { 100 }, 320)
        assertEquals(320, buffer.toFloats().size)
    }

    @Test
    fun `more than 30 s keeps the first 480 000 samples`() {
        val buffer = PcmBuffer()
        var chunk = 0
        repeat(800) { // 800 × 640 = 512 000 samples, 32 s
            val value = (chunk++ % 2).toShort()
            buffer.append(ShortArray(640) { value })
        }
        val floats = buffer.toFloats()
        assertEquals(480_000, floats.size)
        // The 750th chunk (index 749, odd) is the last one kept, whole.
        assertEquals(1 / 32768f, floats[479_999], 0f)
    }

    @Test
    fun `clear empties it`() {
        val buffer = PcmBuffer()
        buffer.append(ShortArray(640))
        buffer.clear()
        assertTrue(buffer.isEmpty)
        assertEquals(0, buffer.toFloats().size)
    }
}
