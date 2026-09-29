package com.axon.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.axon.app.background.BackgroundJobsPlugin;

/**
 * Stage 6 — Capacitor bridge activity.
 * Registers the BackgroundJobs plugin.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundJobsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
