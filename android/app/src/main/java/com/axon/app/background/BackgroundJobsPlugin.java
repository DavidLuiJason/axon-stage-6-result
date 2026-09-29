package com.axon.app.background;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Stage 6 — Capacitor plugin "BackgroundJobs".
 * Bridges JS to the native foreground service.
 */
@CapacitorPlugin(
        name = "BackgroundJobs",
        permissions = {
                @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
        }
)
public class BackgroundJobsPlugin extends Plugin {

    private static BackgroundJobsPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void emitSnapshot(Context ctx) {
        if (instance == null) return;
        try {
            JSONObject snap = BackgroundJobService.readSnapshot(ctx);
            JSObject js = JSObject.fromJSONObject(snap);
            instance.notifyListeners("snapshot", js);
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject o = new JSObject();
        o.put("canRunInBackground", true);
        o.put("platform", "android-native");
        o.put("reason", "Native foreground service (specialUse) owns heartbeats and notification.");
        call.resolve(o);
    }

    @PluginMethod
    public void startJob(PluginCall call) {
        String kind = call.getString("kind", "counter");
        String jobId = "job-" + System.currentTimeMillis();
        String stepsCsv = null;
        try {
            // steps may be array
            if (call.getData().has("steps")) {
                Object raw = call.getData().get("steps");
                if (raw instanceof JSONArray) {
                    JSONArray arr = (JSONArray) raw;
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < arr.length(); i++) {
                        if (i > 0) sb.append('|');
                        sb.append(arr.getString(i));
                    }
                    stepsCsv = sb.toString();
                }
            }
        } catch (Exception ignored) {}

        Intent intent = new Intent(getContext(), BackgroundJobService.class);
        intent.setAction(BackgroundJobService.ACTION_START);
        intent.putExtra(BackgroundJobService.EXTRA_KIND, kind);
        intent.putExtra(BackgroundJobService.EXTRA_JOB_ID, jobId);
        if (stepsCsv != null) intent.putExtra(BackgroundJobService.EXTRA_STEPS, stepsCsv);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        JSObject ret = new JSObject();
        ret.put("jobId", jobId);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopJob(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundJobService.class);
        intent.setAction(BackgroundJobService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        try {
            JSONObject snap = BackgroundJobService.readSnapshot(getContext());
            call.resolve(JSObject.fromJSONObject(snap));
        } catch (Exception e) {
            call.reject("getSnapshot failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT < 33) {
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        boolean granted = ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        // Request via activity
        if (getActivity() != null) {
            ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                    6002
            );
        }
        // Optimistic — caller should re-check
        ret.put("granted", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            String pkg = getContext().getPackageName();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + pkg));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            try {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception ignored) {}
        }
        call.resolve();
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        boolean ignoring = false;
        try {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                ignoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            }
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("ignoring", ignoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void exportDiagnostics(PluginCall call) {
        try {
            JSONObject snap = BackgroundJobService.readSnapshot(getContext());
            JSONObject root = new JSONObject();
            root.put("exportedAt", java.time.Instant.now().toString());
            root.put("platform", "android-native");
            root.put("snapshot", snap);
            JSObject ret = new JSObject();
            ret.put("json", root.toString(2));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("export failed: " + e.getMessage());
        }
    }
}
