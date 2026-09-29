package com.axon.app.background;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import com.axon.app.MainActivity;
import com.axon.app.R;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Stage 6 — Native foreground service that owns background work.
 *
 * - Started only when a job starts; stopped when the job ends or user stops it.
 * - Idle = no service, no wake lock, no timer.
 * - Heartbeat every 5s written by native code to persistent log
 *   (jobId, seq, wall clock, elapsedRealtime, battery %, current step label).
 * - Counter value persisted. On OS restart of the service: resume and write
 *   explicit RESTARTED event with the gap.
 * - FGS type: specialUse (not dataSync / mediaProcessing — Android 15+ 6h cap).
 * - onTimeout: checkpoint, log TIMEOUT, stopSelf().
 * - Notification text = current ACTIVITY LABEL + elapsed time.
 */
public class BackgroundJobService extends Service {

    public static final String TAG = "AxonBgJob";
    public static final String CHANNEL_ID = "axon_background_proof";
    public static final int NOTIF_ID = 6001;

    public static final String ACTION_START = "com.axon.app.bg.START";
    public static final String ACTION_STOP = "com.axon.app.bg.STOP";
    public static final String EXTRA_KIND = "kind";
    public static final String EXTRA_STEPS = "steps";
    public static final String EXTRA_JOB_ID = "jobId";

    public static final String PREFS = "axon_bg_proof";
    public static final long HEARTBEAT_MS = 5000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable heartbeatRunnable;
    private boolean running = false;

    private String jobId;
    private String jobKind; // counter | steps
    private String[] steps;
    private int stepIndex;
    private String stepLabel = "Idle";
    private long startWallClock;
    private int seq;
    private int counterValue;
    private long lastHeartbeatWall;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // System restart with null intent — try resume from prefs
            if (resumeFromPrefs()) {
                beginForeground();
                scheduleHeartbeat();
                writeEvent("RESTARTED", gapFromLast());
                return START_STICKY;
            }
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            writeEvent("STOPPED", 0);
            teardown();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            jobKind = intent.getStringExtra(EXTRA_KIND);
            if (jobKind == null) jobKind = "counter";
            jobId = intent.getStringExtra(EXTRA_JOB_ID);
            if (jobId == null) jobId = "job-" + System.currentTimeMillis();
            String stepsCsv = intent.getStringExtra(EXTRA_STEPS);
            if (stepsCsv != null && stepsCsv.length() > 0) {
                steps = stepsCsv.split("\\|");
            } else {
                steps = new String[]{
                        "Initializing workspace",
                        "Loading configuration",
                        "Validating permissions",
                        "Preparing counter state",
                        "Writing first checkpoint",
                        "Finalizing demo"
                };
            }
            stepIndex = 0;
            seq = 0;
            counterValue = 0;
            startWallClock = System.currentTimeMillis();
            lastHeartbeatWall = startWallClock;
            if ("steps".equals(jobKind)) {
                stepLabel = steps[0];
            } else {
                stepLabel = "Counting · 0";
            }
            persistState();
            beginForeground();
            running = true;
            writeEvent("STARTED", 0);
            scheduleHeartbeat();
            return START_STICKY;
        }

        // Unexpected — try resume
        if (resumeFromPrefs()) {
            beginForeground();
            scheduleHeartbeat();
            writeEvent("RESTARTED", gapFromLast());
            return START_STICKY;
        }
        stopSelf();
        return START_NOT_STICKY;
    }

    /**
     * Android 15+ timeout for specialUse / other types.
     * Checkpoint, log TIMEOUT, stopSelf.
     */
    @Override
    public void onTimeout(int startId) {
        Log.w(TAG, "onTimeout startId=" + startId);
        stepLabel = "Timed out by OS";
        writeEvent("TIMEOUT", 0);
        persistState();
        teardown();
        stopSelf();
    }

    @Override
    public void onDestroy() {
        teardown();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void beginForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            ServiceCompat.startForeground(
                    this,
                    NOTIF_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            );
        } else {
            startForeground(NOTIF_ID, notification);
        }
        running = true;
    }

    private Notification buildNotification() {
        long elapsed = Math.max(0, System.currentTimeMillis() - startWallClock);
        String elapsedText = formatElapsed(elapsed);
        String content = stepLabel + " · " + elapsedText;

        Intent launch = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("AXON Background Proof")
                .setContentText(content)
                .setSmallIcon(R.drawable.ic_notification)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(pi)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_ID, buildNotification());
        }
    }

    private void scheduleHeartbeat() {
        cancelHeartbeat();
        heartbeatRunnable = new Runnable() {
            @Override
            public void run() {
                if (!running) return;
                onHeartbeatTick();
                handler.postDelayed(this, HEARTBEAT_MS);
            }
        };
        handler.postDelayed(heartbeatRunnable, HEARTBEAT_MS);
    }

    private void cancelHeartbeat() {
        if (heartbeatRunnable != null) {
            handler.removeCallbacks(heartbeatRunnable);
            heartbeatRunnable = null;
        }
    }

    private void onHeartbeatTick() {
        if ("counter".equals(jobKind)) {
            counterValue += 1;
            stepLabel = "Counting · " + counterValue;
            writeEvent("HEARTBEAT", 0);
        } else if ("steps".equals(jobKind)) {
            if (stepIndex < steps.length) {
                stepLabel = steps[stepIndex];
                writeEvent("STEP", 0);
                writeEvent("HEARTBEAT", 0);
                stepIndex += 1;
                if (stepIndex >= steps.length) {
                    writeEvent("STOPPED", 0);
                    teardown();
                    stopSelf();
                    return;
                }
            }
        } else {
            writeEvent("HEARTBEAT", 0);
        }
        persistState();
        updateNotification();
        BackgroundJobsPlugin.emitSnapshot(this);
    }

    private void writeEvent(String eventType, long gapMs) {
        seq += 1;
        lastHeartbeatWall = System.currentTimeMillis();
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            String logJson = prefs.getString("log", "[]");
            JSONArray arr = new JSONArray(logJson);
            JSONObject rec = new JSONObject();
            rec.put("jobId", jobId != null ? jobId : "");
            rec.put("seq", seq);
            rec.put("wallClock", lastHeartbeatWall);
            rec.put("elapsedRealtime", SystemClock.elapsedRealtime());
            rec.put("batteryPercent", readBatteryPercent());
            rec.put("stepLabel", stepLabel);
            rec.put("eventType", eventType);
            rec.put("counterValue", counterValue);
            if ("RESTARTED".equals(eventType) && gapMs > 0) {
                rec.put("gapMs", gapMs);
            }
            arr.put(rec);
            // Cap log size
            while (arr.length() > 500) {
                arr.remove(0);
            }
            prefs.edit().putString("log", arr.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "writeEvent failed", e);
        }
    }

    private int readBatteryPercent() {
        try {
            BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
            if (bm != null) {
                return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            }
        } catch (Exception ignored) {}
        return -1;
    }

    private void persistState() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        prefs.edit()
                .putBoolean("running", running)
                .putString("jobId", jobId)
                .putString("jobKind", jobKind)
                .putString("stepLabel", stepLabel)
                .putLong("startWallClock", startWallClock)
                .putInt("seq", seq)
                .putInt("counterValue", counterValue)
                .putInt("stepIndex", stepIndex)
                .putLong("lastHeartbeatWall", lastHeartbeatWall)
                .putString("stepsCsv", steps != null ? String.join("|", steps) : "")
                .apply();
    }

    private boolean resumeFromPrefs() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (!prefs.getBoolean("running", false)) return false;
        jobId = prefs.getString("jobId", null);
        jobKind = prefs.getString("jobKind", "counter");
        stepLabel = prefs.getString("stepLabel", "Resumed");
        startWallClock = prefs.getLong("startWallClock", System.currentTimeMillis());
        seq = prefs.getInt("seq", 0);
        counterValue = prefs.getInt("counterValue", 0);
        stepIndex = prefs.getInt("stepIndex", 0);
        lastHeartbeatWall = prefs.getLong("lastHeartbeatWall", startWallClock);
        String csv = prefs.getString("stepsCsv", "");
        if (csv.length() > 0) steps = csv.split("\\|");
        running = true;
        return jobId != null;
    }

    private long gapFromLast() {
        long last = getSharedPreferences(PREFS, MODE_PRIVATE)
                .getLong("lastHeartbeatWall", 0);
        if (last <= 0) return 0;
        return Math.max(0, System.currentTimeMillis() - last);
    }

    private void teardown() {
        running = false;
        cancelHeartbeat();
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        prefs.edit().putBoolean("running", false).apply();
        try {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } catch (Exception ignored) {}
        BackgroundJobsPlugin.emitSnapshot(this);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID,
                    "AXON Background Proof",
                    NotificationManager.IMPORTANCE_LOW
            );
            ch.setDescription("Native heartbeat evidence for background execution");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    static String formatElapsed(long ms) {
        long totalSec = Math.max(0, ms / 1000);
        long days = totalSec / 86400;
        long hours = (totalSec % 86400) / 3600;
        long minutes = (totalSec % 3600) / 60;
        long seconds = totalSec % 60;
        if (days > 0) return days + "d " + hours + "h " + String.format("%02d", minutes) + "m";
        if (hours > 0) return hours + "h " + String.format("%02d", minutes) + "m " + String.format("%02d", seconds) + "s";
        if (minutes > 0) return minutes + "m " + String.format("%02d", seconds) + "s";
        return seconds + "s";
    }

    /** Snapshot for the plugin / JS layer. */
    public static JSONObject readSnapshot(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        JSONObject o = new JSONObject();
        try {
            o.put("jobId", prefs.getString("jobId", null));
            o.put("jobKind", prefs.getString("jobKind", null));
            o.put("running", prefs.getBoolean("running", false));
            long start = prefs.getLong("startWallClock", 0);
            if (start > 0) o.put("startWallClock", start);
            else o.put("startWallClock", JSONObject.NULL);
            o.put("stepLabel", prefs.getString("stepLabel", ""));
            o.put("counterValue", prefs.getInt("counterValue", 0));
            o.put("serviceActive", prefs.getBoolean("running", false));
            String logJson = prefs.getString("log", "[]");
            o.put("heartbeats", new JSONArray(logJson));
        } catch (Exception e) {
            Log.e(TAG, "readSnapshot", e);
        }
        return o;
    }
}
