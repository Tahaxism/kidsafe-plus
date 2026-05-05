package expo.modules.kidsafenative.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import android.telephony.SmsMessage

/**
 * Broadcast receiver that listens for incoming SMS and forwards to a static
 * relay (set by KidsafeNativeModule on init) so the JS layer can react.
 *
 * The receiver must be registered dynamically (not in the manifest) on
 * Android 8+ for SMS_RECEIVED — Google restricted manifest-declared SMS
 * receivers. We do that from KidsafeNativeModule.OnCreate().
 */
class SmsReceiver : BroadcastReceiver() {
    interface Listener {
        fun onSmsReceived(sender: String, body: String, ts: Long)
    }

    companion object {
        @Volatile
        var listener: Listener? = null
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val l = listener ?: return
        val msgs = parseMessages(intent) ?: return
        // Multipart SMS arrive as multiple messages with the same originating
        // address. Concatenate into a single body keyed by sender.
        val merged = HashMap<String, StringBuilder>()
        var earliest = Long.MAX_VALUE
        for (m in msgs) {
            val from = m.originatingAddress ?: continue
            val sb = merged.getOrPut(from) { StringBuilder() }
            sb.append(m.messageBody ?: "")
            if (m.timestampMillis < earliest) earliest = m.timestampMillis
        }
        if (earliest == Long.MAX_VALUE) earliest = System.currentTimeMillis()
        for ((from, sb) in merged) {
            l.onSmsReceived(from, sb.toString(), earliest)
        }
    }

    private fun parseMessages(intent: Intent): Array<SmsMessage>? {
        // API 19+: built-in helper.
        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (msgs != null && msgs.isNotEmpty()) return msgs
        // Older fallback — kept for safety.
        @Suppress("DEPRECATION")
        val pdus = (intent.extras?.get("pdus") as? Array<*>) ?: return null
        val format = intent.getStringExtra("format")
        val out = ArrayList<SmsMessage>(pdus.size)
        for (pdu in pdus) {
            val bytes = pdu as? ByteArray ?: continue
            val m = if (format != null) {
                SmsMessage.createFromPdu(bytes, format)
            } else {
                @Suppress("DEPRECATION")
                SmsMessage.createFromPdu(bytes)
            }
            if (m != null) out.add(m)
        }
        return if (out.isEmpty()) null else out.toTypedArray()
    }
}
