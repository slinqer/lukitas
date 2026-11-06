# Vosk calls its native library through JNA, which finds classes, fields and methods by name: R8
# must not rename or remove them, or Vosk fails when the model loads (voice spike report, notes for
# Task 12).
-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-keep class org.vosk.** { *; }
-dontwarn java.awt.**

# sherpa-onnx (the precise voice model's runtime) is reached through JNI, which finds its Kotlin
# classes, fields and methods by name (config classes read field by field, results built by name):
# R8 must not rename or remove them, or the first recognizer fails with NoSuchFieldError or
# ClassNotFoundException. Native methods are kept too.
-keep class com.k2fsa.sherpa.onnx.** { *; }
-keepclasseswithmembernames class * { native <methods>; }
