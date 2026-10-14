package com.cuidarte.carmen;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Edge-to-edge on every Android version, as Android 15+ already enforces: the page
        // draws behind the system bars and the cutout and keeps clear of them itself with
        // env(safe-area-inset-*). Without this, older versions (e.g. Android 11) pad the
        // content away from the cutout, leaving a strip of window background beside it.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        // When fullscreen hides the system bars (SystemBars.hide() from the web code), a swipe
        // from the edge shows them only briefly instead of leaving fullscreen for good.
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        // Draw behind a camera cutout in landscape too, instead of leaving a black strip there.
        // The web code keeps its buttons clear of it with env(safe-area-inset-*).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(params);
        }
    }
}
