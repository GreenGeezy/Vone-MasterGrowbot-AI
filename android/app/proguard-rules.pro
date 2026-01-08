# P1. PROTECT CAPACITOR RUNTIME
-keep public class com.getcapacitor.** { *; }
-keep public class com.getcapacitor.Plugin { *; }
-keep public class com.getcapacitor.BridgeActivity { *; }

# P2. PROTECT FIREBASE & GOOGLE SERVICES
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# P3. WEBVIEW BRIDGE PROTECTION
-keepattributes *Annotation*
-keep public class * extends com.getcapacitor.Plugin
