package expo.modules.kidsafenative.services

import android.content.Context
import android.content.SharedPreferences

object BlocklistStore {
    private const val PREFS = "kidsafe.blocklist"
    private const val KEY = "packages"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun set(ctx: Context, packages: Set<String>) {
        prefs(ctx).edit().putStringSet(KEY, packages).apply()
    }

    fun get(ctx: Context): Set<String> =
        prefs(ctx).getStringSet(KEY, emptySet()) ?: emptySet()
}
