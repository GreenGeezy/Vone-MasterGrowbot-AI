package com.mastergrowbot.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.revenuecat.purchases.capacitor.PurchasesPlugin; // Import RevenueCat

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Manual Registration to fix "Plugin not implemented" error
        registerPlugin(PurchasesPlugin.class);
    }
}
