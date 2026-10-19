package com.mastergrowbot.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;

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
            int handledTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets systemBars = windowInsets.getInsets(handledTypes);
            // Padding inside a WebView does not move CSS fixed/inset:0 controls.
            // Resize its native bounds so every web viewport stays above system UI.
            ViewGroup.MarginLayoutParams layout = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            if (layout.leftMargin != systemBars.left || layout.topMargin != systemBars.top
                    || layout.rightMargin != systemBars.right || layout.bottomMargin != systemBars.bottom) {
                layout.setMargins(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
                view.setLayoutParams(layout);
            }
            // Native margins own these insets. Zero them to avoid double spacing
            // in newer WebViews; leave keyboard insets/notifications intact.
            return new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(handledTypes, Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
