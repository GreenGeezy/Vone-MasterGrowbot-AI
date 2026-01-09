# 1. PROTECT ENTRY POINTS (Fixes the Startup Crash)
-keep public class com.mastergrowbot.app.MainActivity { *; }

# 2. PROTECT CAPACITOR ENGINE
-keep public class com.getcapacitor.** { *; }
-keep public class com.getcapacitor.Plugin { *; }
-keep public class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.android.** { *; }
-keep class com.getcapacitor.bridge.** { *; }

# 3. PROTECT FIREBASE & GOOGLE AUTH
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.google.android.play.** { *; }

# 4. GENERAL WEBVIEW PROTECTION
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends com.getcapacitor.Plugin
