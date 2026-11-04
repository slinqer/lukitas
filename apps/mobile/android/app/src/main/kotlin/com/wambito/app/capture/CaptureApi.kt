package com.wambito.app.capture

import com.wambito.app.notices.ApiResult
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.Locale

/** What the API says of a capture (`captureResultDto`). */
data class CaptureAnswer(
    /** The server had already saved this purchase (the other bank app notified it too). */
    val merged: Boolean,
    val id: String,
    /** Signed: negative for an expense. */
    val amountCents: Long,
    val currency: String,
    val name: String,
    val categoryName: String,
    /** The category is the kind's fallback ("Otros gastos"): the merchant is new. */
    val isFallback: Boolean,
)

/**
 * The two calls a capture makes, as [com.wambito.app.notices.NoticeApi] makes its reads: `<server>/api`,
 * the bearer token, the phone's zone and language, `x-wambito-background: 1` (a job the person did
 * not start is not activity). With the platform's HttpURLConnection: no HTTP library.
 */
class CaptureApi(
    private val connectTimeoutMillis: Int = 10_000,
    private val readTimeoutMillis: Int = 20_000,
    /**
     * Sets the request method. The platform's connection (OkHttp inside Android) knows PATCH; the
     * JDK's, which the unit tests run on, does not, so the tests pass their own.
     */
    private val setMethod: (HttpURLConnection, String) -> Unit = { connection, method -> connection.requestMethod = method },
) {
    /**
     * `POST /v1/captures` with the item's key as `Idempotency-Key`, so a send repeated after a
     * crash or a lost answer saves nothing twice. The body is exactly the six fields of
     * [ParsedCapture]. A 4xx other than 401 is [ApiResult.Rejected]: the server refuses the capture
     * itself, so sending it again can only fail again.
     */
    fun send(server: String, token: String, item: QueuedCapture): ApiResult<CaptureAnswer> {
        val capture = item.capture
        val body = JSONObject()
            .put("kind", capture.kind.name.lowercase())
            .put("amount", capture.amountCents)
            .put("currency", capture.currency)
            .put("merchant", capture.merchant)
            .put("capturedAt", capture.capturedAt.truncatedTo(ChronoUnit.MILLIS).toString())
            .put("source", capture.source.wire)
        return when (val answer = call(server, token, "POST", "/v1/captures", body.toString(), item.key)) {
            is ApiResult.Ok -> try {
                val doc = JSONObject(answer.value)
                val transaction = doc.getJSONObject("transaction")
                val category = doc.getJSONObject("category")
                ApiResult.Ok(
                    CaptureAnswer(
                        merged = doc.getString("result") == "merged",
                        id = transaction.getString("id"),
                        amountCents = transaction.getLong("amount"),
                        currency = transaction.getString("currency"),
                        name = transaction.getString("name"),
                        categoryName = category.getString("name"),
                        isFallback = category.getBoolean("fallback"),
                    ),
                )
            } catch (_: JSONException) {
                ApiResult.Failed
            }
            ApiResult.Unauthorized -> ApiResult.Unauthorized
            ApiResult.Failed -> ApiResult.Failed
            ApiResult.Rejected -> ApiResult.Rejected
        }
    }

    /** "Bien": `PATCH /v1/transactions/{id}` with `{"needsReview": false}`. Setting it twice is harmless. */
    fun confirm(server: String, token: String, id: String): ApiResult<Unit> {
        val path = "/v1/transactions/" + URLEncoder.encode(id, "UTF-8").replace("+", "%20")
        return when (val answer = call(server, token, "PATCH", path, """{"needsReview":false}""", null)) {
            is ApiResult.Ok -> ApiResult.Ok(Unit)
            ApiResult.Unauthorized -> ApiResult.Unauthorized
            ApiResult.Failed -> ApiResult.Failed
            ApiResult.Rejected -> ApiResult.Rejected
        }
    }

    private fun call(
        server: String,
        token: String,
        method: String,
        path: String,
        body: String,
        idempotencyKey: String?,
    ): ApiResult<String> {
        val url = try {
            URL("${server.trimEnd('/')}/api$path")
        } catch (_: IOException) {
            return ApiResult.Failed
        }
        if (url.protocol != "https" && url.protocol != "http") return ApiResult.Failed
        val connection = try {
            url.openConnection() as HttpURLConnection
        } catch (_: IOException) {
            return ApiResult.Failed
        }
        return try {
            connection.connectTimeout = connectTimeoutMillis
            connection.readTimeout = readTimeoutMillis
            connection.instanceFollowRedirects = false
            setMethod(connection, method)
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Content-Type", "application/json")
            if (idempotencyKey != null) connection.setRequestProperty("Idempotency-Key", idempotencyKey)
            connection.setRequestProperty("x-wambito-background", "1")
            connection.setRequestProperty("x-wambito-timezone", ZoneId.systemDefault().id)
            connection.setRequestProperty("x-wambito-locale", Locale.getDefault().toLanguageTag())
            connection.doOutput = true
            connection.outputStream.use { it.write(body.toByteArray()) }
            when (connection.responseCode) {
                200, 201 -> ApiResult.Ok(connection.inputStream.bufferedReader().use { it.readText() })
                401 -> ApiResult.Unauthorized
                // 408 and 429 are the server asking to be tried again, not refusing the capture.
                408, 429 -> ApiResult.Failed
                in 400..499 -> ApiResult.Rejected
                else -> ApiResult.Failed
            }
        } catch (_: IOException) {
            // ProtocolException (a method this platform does not know) is an IOException too.
            ApiResult.Failed
        } finally {
            connection.disconnect()
        }
    }
}
