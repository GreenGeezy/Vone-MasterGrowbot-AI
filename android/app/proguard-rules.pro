# Manifest entry points and the native RevenueCat bootstrap remain explicit.
-keep public class com.mastergrowbot.app.MainActivity { *; }
-keep public class com.mastergrowbot.app.MasterGrowbotApplication { *; }

# Capacitor ships consumer rules for its reflection-based plugin bridge.
# Explicitly retain our registered diagnostics plugin and JS-callable methods.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}
# Firebase, Play and RevenueCat ship their own consumer rules. Avoid keeping
# entire dependency packages, which prevents R8 from optimizing unused code.
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
