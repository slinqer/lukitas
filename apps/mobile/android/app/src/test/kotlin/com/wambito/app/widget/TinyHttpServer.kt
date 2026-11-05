package com.wambito.app.widget

import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.ServerSocket
import java.net.SocketException
import kotlin.concurrent.thread

/** A request as [TinyHttpServer] saw it. */
class TinyRequest(
    val path: String,
    val headers: Map<String, String>,
    val query: String = "",
    val method: String = "GET",
    val body: String = "",
)

/**
 * One-connection-at-a-time HTTP/1.1 on 127.0.0.1, enough for the refresh job's GET (the JDK's own
 * server is not on an Android test classpath). [answer] gives the status and body.
 */
class TinyHttpServer(private val answer: (TinyRequest) -> Pair<Int, String>) {
    private val socket = ServerSocket(0, 10, InetAddress.getByName("127.0.0.1"))
    val port: Int get() = socket.localPort

    init {
        thread(isDaemon = true) {
            while (true) {
                val client = try {
                    socket.accept()
                } catch (_: SocketException) {
                    return@thread
                }
                client.use {
                    val reader = BufferedReader(InputStreamReader(it.getInputStream(), Charsets.ISO_8859_1))
                    val line = reader.readLine() ?: return@use
                    val headers = mutableMapOf<String, String>()
                    while (true) {
                        val header = reader.readLine() ?: break
                        if (header.isEmpty()) break
                        val colon = header.indexOf(':')
                        if (colon > 0) headers[header.substring(0, colon).trim().lowercase()] = header.substring(colon + 1).trim()
                    }
                    val method = line.substringBefore(' ')
                    val length = headers["content-length"]?.toIntOrNull() ?: 0
                    val raw = CharArray(length)
                    var got = 0
                    while (got < length) {
                        val n = reader.read(raw, got, length - got)
                        if (n < 0) break
                        got += n
                    }
                    // Read as Latin-1 so one char is one byte; the body is UTF-8.
                    val requestBody = String(String(raw, 0, got).toByteArray(Charsets.ISO_8859_1), Charsets.UTF_8)
                    val target = line.split(" ").getOrElse(1) { "/" }
                    val path = target.substringBefore('?')
                    val query = target.substringAfter('?', "")
                    val (status, body) = answer(TinyRequest(path, headers, query, method, requestBody))
                    val bytes = body.toByteArray()
                    val out = it.getOutputStream()
                    out.write(
                        ("HTTP/1.1 $status X\r\nContent-Type: application/json\r\n" +
                            "Content-Length: ${bytes.size}\r\nConnection: close\r\n\r\n").toByteArray(),
                    )
                    out.write(bytes)
                    out.flush()
                }
            }
        }
    }

    fun stop() = socket.close()
}
