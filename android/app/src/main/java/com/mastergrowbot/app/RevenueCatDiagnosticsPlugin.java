package com.mastergrowbot.app;

import com.revenuecat.purchases.Purchases;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Android-only, sanitized RevenueCat startup diagnostics and recovery. */
@CapacitorPlugin(name = "RevenueCatDiagnostics")
public final class RevenueCatDiagnosticsPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(toJSObject(MasterGrowbotApplication.getBootstrapStatus()));
    }

    @PluginMethod
    public void ensureConfigured(PluginCall call) {
        MasterGrowbotApplication.RevenueCatBootstrapStatus status =
            MasterGrowbotApplication.ensureRevenueCatConfigured();
        call.resolve(toJSObject(status));
    }

    /**
     * Re-arms RevenueCat's Google Play Billing connection after a request timeout.
     * RevenueCat owns the single Purchases instance; this does not configure a
     * second SDK instance or change its anonymous App User ID.
     */
    @PluginMethod
    public void recoverConnection(PluginCall call) {
        Runnable recovery = () -> {
            MasterGrowbotApplication.RevenueCatBootstrapStatus status =
                MasterGrowbotApplication.ensureRevenueCatConfigured();
            if (status.configured) {
                try {
                    Purchases.getSharedInstance().onAppBackgrounded();
                    Purchases.getSharedInstance().onAppForegrounded();
                } catch (RuntimeException ignored) {
                    // Return sanitized native state; JavaScript surfaces the retry result.
                }
            }
            call.resolve(toJSObject(MasterGrowbotApplication.getBootstrapStatus()));
        };

        if (getActivity() != null) {
            getActivity().runOnUiThread(recovery);
        } else {
            recovery.run();
        }
    }

    private JSObject toJSObject(MasterGrowbotApplication.RevenueCatBootstrapStatus status) {
        JSObject result = new JSObject();
        result.put("attempted", status.attempted);
        result.put("succeeded", status.succeeded);
        result.put("configured", status.configured);
        result.put("errorCode", status.errorCode);
        result.put("elapsedMs", status.elapsedMs);
        result.put("pluginRegistered", true);
        result.put("versionCode", BuildConfig.VERSION_CODE);
        result.put("versionName", BuildConfig.VERSION_NAME);
        return result;
    }
}
