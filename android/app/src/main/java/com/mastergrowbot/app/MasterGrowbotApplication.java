package com.mastergrowbot.app;

import android.app.Application;
import android.util.Log;

import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;

/** Configures the single RevenueCat process instance before Capacitor starts. */
public final class MasterGrowbotApplication extends Application {
    private static final String LOG_TAG = "MGBRevenueCat";

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            Purchases.configure(
                new PurchasesConfiguration.Builder(this, BuildConfig.REVENUECAT_ANDROID_API_KEY)
                    .build()
            );
            Log.i(LOG_TAG, "RC_NATIVE_BOOTSTRAP_SUCCESS");
        } catch (RuntimeException error) {
            // Keep the app usable. Never include keys, identities, or purchase
            // data in the release diagnostic.
            Log.e(LOG_TAG, "RC_NATIVE_BOOTSTRAP_ERROR:" + error.getClass().getSimpleName());
        }
    }
}
