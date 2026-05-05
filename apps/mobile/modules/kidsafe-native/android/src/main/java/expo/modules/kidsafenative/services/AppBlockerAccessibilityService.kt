package expo.modules.kidsafenative.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class AppBlockerAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val ev = event ?: return
        if (ev.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = ev.packageName?.toString() ?: return

        val blocked = BlocklistStore.get(applicationContext)
        if (!blocked.contains(pkg)) return
        // Drop the user back to launcher when a blocked app comes to the foreground.
        try {
            val home = Intent(Intent.ACTION_MAIN)
            home.addCategory(Intent.CATEGORY_HOME)
            home.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(home)
            Log.i("Kidsafe", "Blocked app intercepted: $pkg")
        } catch (e: Exception) {
            Log.w("Kidsafe", "Failed to redirect home: ${e.message}")
        }
    }

    override fun onInterrupt() {}

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = AccessibilityServiceInfo.DEFAULT
        info.notificationTimeout = 100
        serviceInfo = info
    }

    companion object {
        fun isEnabled(ctx: Context): Boolean {
            val expected = ctx.packageName + "/" + AppBlockerAccessibilityService::class.java.name
            val enabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
                Settings.Secure.getString(
                    ctx.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                ) ?: ""
            } else ""
            return enabled.split(":").any { it.equals(expected, ignoreCase = true) }
        }
    }
}
