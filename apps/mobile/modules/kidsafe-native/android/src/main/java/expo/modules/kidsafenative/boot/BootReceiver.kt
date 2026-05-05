package expo.modules.kidsafenative.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i("Kidsafe", "Boot completed — KidSafe+ Accessibility service may need re-enabling.")
            // Accessibility services restart automatically once enabled. We
            // log here so the parent can verify in logs that the device is
            // back online.
        }
    }
}
