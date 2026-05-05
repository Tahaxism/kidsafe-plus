package expo.modules.kidsafenative

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.provider.Telephony
import expo.modules.kidsafenative.admin.KidsafeDeviceAdminReceiver
import expo.modules.kidsafenative.services.AppBlockerAccessibilityService
import expo.modules.kidsafenative.services.BlocklistStore
import expo.modules.kidsafenative.sms.SmsReceiver
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

class KidsafeNativeModule : Module() {
    private var smsReceiver: SmsReceiver? = null

    override fun definition() = ModuleDefinition {
        Name("KidsafeNative")

        Events("onSmsReceived")

        OnCreate {
            // Wire the receiver's static listener to fire JS events.
            SmsReceiver.listener = object : SmsReceiver.Listener {
                override fun onSmsReceived(sender: String, body: String, ts: Long) {
                    sendEvent(
                        "onSmsReceived",
                        mapOf(
                            "sender" to sender,
                            "body" to body,
                            "ts" to ts
                        )
                    )
                }
            }
        }

        OnDestroy {
            unregisterSmsReceiverInternal()
            SmsReceiver.listener = null
        }

        AsyncFunction("hasSmsPermission") { ->
            val ctx = context()
            return@AsyncFunction (
                ctx.checkSelfPermission(Manifest.permission.RECEIVE_SMS) ==
                    PackageManager.PERMISSION_GRANTED &&
                ctx.checkSelfPermission(Manifest.permission.READ_SMS) ==
                    PackageManager.PERMISSION_GRANTED
            )
        }

        AsyncFunction("startSmsListener") { ->
            val ctx = context()
            val granted = ctx.checkSelfPermission(Manifest.permission.RECEIVE_SMS) ==
                PackageManager.PERMISSION_GRANTED
            if (!granted) return@AsyncFunction false
            if (smsReceiver != null) return@AsyncFunction true
            val r = SmsReceiver()
            val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION).apply {
                priority = 999
            }
            ctx.registerReceiver(r, filter)
            smsReceiver = r
            return@AsyncFunction true
        }

        AsyncFunction("stopSmsListener") { ->
            unregisterSmsReceiverInternal()
            return@AsyncFunction true
        }

        AsyncFunction("hasUsageAccess") { ->
            return@AsyncFunction hasUsageAccess(context())
        }

        AsyncFunction("openUsageAccessSettings") { ->
            val ctx = context()
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            ctx.startActivity(intent)
        }

        AsyncFunction("getTodayUsage") { ->
            val ctx = context()
            if (!hasUsageAccess(ctx)) {
                return@AsyncFunction emptyList<Map<String, Any?>>()
            }
            val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val start = cal.timeInMillis
            val end = System.currentTimeMillis()
            val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
            val pm = ctx.packageManager
            val out = ArrayList<Map<String, Any?>>(stats.size)
            for (s in stats) {
                if (s.totalTimeInForeground <= 0L) continue
                val label = try {
                    val ai = pm.getApplicationInfo(s.packageName, 0)
                    pm.getApplicationLabel(ai).toString()
                } catch (_: Exception) {
                    s.packageName
                }
                out.add(
                    mapOf(
                        "packageName" to s.packageName,
                        "appLabel" to label,
                        "totalTimeForegroundMin" to (s.totalTimeInForeground / 60000.0),
                        "lastTimeUsed" to s.lastTimeUsed
                    )
                )
            }
            return@AsyncFunction out
        }

        AsyncFunction("getInstalledApps") { ->
            val ctx = context()
            val pm = ctx.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null)
            intent.addCategory(Intent.CATEGORY_LAUNCHER)
            val list = pm.queryIntentActivities(intent, 0)
            val out = ArrayList<Map<String, Any?>>(list.size)
            for (ri in list) {
                val ai = ri.activityInfo.applicationInfo
                val isSystem = (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                out.add(
                    mapOf(
                        "packageName" to ai.packageName,
                        "label" to pm.getApplicationLabel(ai).toString(),
                        "isSystem" to isSystem
                    )
                )
            }
            return@AsyncFunction out
        }

        AsyncFunction("requestDeviceAdmin") { ->
            val ctx = context()
            val intent = Intent(android.app.admin.DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            intent.putExtra(
                android.app.admin.DevicePolicyManager.EXTRA_DEVICE_ADMIN,
                ComponentName(ctx, KidsafeDeviceAdminReceiver::class.java)
            )
            intent.putExtra(
                android.app.admin.DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "KidSafe+ needs Device Admin to lock the device when a parent triggers a remote lock."
            )
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            ctx.startActivity(intent)
            return@AsyncFunction true
        }

        AsyncFunction("isDeviceAdminActive") { ->
            val ctx = context()
            val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as android.app.admin.DevicePolicyManager
            return@AsyncFunction dpm.isAdminActive(ComponentName(ctx, KidsafeDeviceAdminReceiver::class.java))
        }

        AsyncFunction("lockNow") { ->
            val ctx = context()
            val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as android.app.admin.DevicePolicyManager
            dpm.lockNow()
        }

        AsyncFunction("isAccessibilityEnabled") { ->
            val ctx = context()
            return@AsyncFunction AppBlockerAccessibilityService.isEnabled(ctx)
        }

        AsyncFunction("openAccessibilitySettings") { ->
            val ctx = context()
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            ctx.startActivity(intent)
        }

        AsyncFunction("setBlockedPackages") { packages: List<String> ->
            BlocklistStore.set(context(), packages.toSet())
        }

        AsyncFunction("openOverlaySettings") { ->
            val ctx = context()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:" + ctx.packageName)
                )
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                ctx.startActivity(intent)
            }
        }

        AsyncFunction("hasOverlayPermission") { ->
            val ctx = context()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(ctx)
            } else {
                true
            }
        }
    }

    private fun context(): Context =
        appContext.reactContext ?: throw IllegalStateException("React context unavailable")

    private fun unregisterSmsReceiverInternal() {
        val r = smsReceiver ?: return
        try {
            context().unregisterReceiver(r)
        } catch (_: Exception) {
        }
        smsReceiver = null
    }

    private fun hasUsageAccess(ctx: Context): Boolean {
        val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                ctx.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                ctx.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}
