package com.mastergrowbot.app;

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
