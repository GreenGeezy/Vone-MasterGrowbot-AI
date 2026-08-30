package com.mastergrowbot.app;

import android.os.Bundle;
import android.view.View;

import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        registerPlugin(RevenueCatDiagnosticsPlugin.class);
        super.onCreate(savedInstanceState);
        applySystemBarInsets();
    }

    private void applySystemBarInsets() {
        View webView = bridge != null ? bridge.getWebView() : null;
        if (webView == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets systemBars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            // Preserve IME and plugin inset dispatch; only the WebView system-bar padding is owned here.
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
