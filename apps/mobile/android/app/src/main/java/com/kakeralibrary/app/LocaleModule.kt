package com.kakeralibrary.app

import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocaleModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "LocaleModule"

    @ReactMethod
    fun setLocale(languageTag: String) {
        val locales = LocaleListCompat.forLanguageTags(languageTag)
        Handler(Looper.getMainLooper()).post {
            AppCompatDelegate.setApplicationLocales(locales)
        }
    }
}
