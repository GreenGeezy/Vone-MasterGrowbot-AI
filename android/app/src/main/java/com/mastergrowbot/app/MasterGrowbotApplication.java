package com.mastergrowbot.app;

import android.app.Application;
import android.util.Log;

import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;

/** Configures the single RevenueCat process instance before Capacitor starts. */
public final class MasterGrowbotApplication extends Application {
    private static final String LOG_TAG = "MGBRevenueCat";
    private static final Object CONFIGURATION_LOCK = new Object();
    private static volatile boolean bootstrapAttempted;
    private static volatile boolean bootstrapSucceeded;
    private static volatile String bootstrapErrorCode = "NONE";
    private static volatile long bootstrapElapsedMs;
    private static volatile Application application;

    @Override
    public void onCreate() {
        super.onCreate();
        application = this;
        ensureRevenueCatConfigured();
    }

    /**
     * Idempotent native recovery point used by both process startup and the
     * Android-only Capacitor diagnostics bridge. No identity or credential is
     * ever included in the returned state.
     */
    public static RevenueCatBootstrapStatus ensureRevenueCatConfigured() {
        long startedAt = System.currentTimeMillis();
        synchronized (CONFIGURATION_LOCK) {
            bootstrapAttempted = true;
            if (Purchases.isConfigured()) {
                bootstrapSucceeded = true;
                bootstrapErrorCode = "NONE";
                bootstrapElapsedMs = System.currentTimeMillis() - startedAt;
                Log.i(LOG_TAG, "RC_NATIVE_ALREADY_CONFIGURED");
                return getBootstrapStatus();
            }

            if (application == null) {
                bootstrapSucceeded = false;
                bootstrapErrorCode = "RC_APP_CONTEXT_MISSING";
                bootstrapElapsedMs = System.currentTimeMillis() - startedAt;
                Log.e(LOG_TAG, "RC_NATIVE_BOOTSTRAP_ERROR:RC_APP_CONTEXT_MISSING");
                return getBootstrapStatus();
            }

            try {
                Purchases.configure(
                    new PurchasesConfiguration.Builder(
                        application,
                        BuildConfig.REVENUECAT_ANDROID_API_KEY
                    ).build()
                );
                bootstrapSucceeded = Purchases.isConfigured();
                bootstrapErrorCode = bootstrapSucceeded ? "NONE" : "RC_NATIVE_NOT_CONFIGURED";
                Log.i(LOG_TAG, bootstrapSucceeded
                    ? "RC_NATIVE_BOOTSTRAP_SUCCESS"
                    : "RC_NATIVE_BOOTSTRAP_INCOMPLETE");
            } catch (RuntimeException error) {
                bootstrapSucceeded = false;
                bootstrapErrorCode = sanitizeErrorCode(error);
                Log.e(LOG_TAG, "RC_NATIVE_BOOTSTRAP_ERROR:" + bootstrapErrorCode);
            } finally {
                bootstrapElapsedMs = System.currentTimeMillis() - startedAt;
            }
            return getBootstrapStatus();
        }
    }

    public static RevenueCatBootstrapStatus getBootstrapStatus() {
        boolean configured = Purchases.isConfigured();
        return new RevenueCatBootstrapStatus(
            bootstrapAttempted,
            bootstrapSucceeded && configured,
            configured,
            bootstrapErrorCode,
            bootstrapElapsedMs
        );
    }

    private static String sanitizeErrorCode(RuntimeException error) {
        String simpleName = error.getClass().getSimpleName();
        return simpleName == null || simpleName.isEmpty() ? "RuntimeException" : simpleName;
    }

    public static final class RevenueCatBootstrapStatus {
        public final boolean attempted;
        public final boolean succeeded;
        public final boolean configured;
        public final String errorCode;
        public final long elapsedMs;

        RevenueCatBootstrapStatus(
            boolean attempted,
            boolean succeeded,
            boolean configured,
            String errorCode,
            long elapsedMs
        ) {
            this.attempted = attempted;
            this.succeeded = succeeded;
            this.configured = configured;
            this.errorCode = errorCode;
            this.elapsedMs = elapsedMs;
        }
    }
}
