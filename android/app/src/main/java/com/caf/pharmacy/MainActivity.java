package com.caf.pharmacy;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int STARTUP_PERMISSION_REQUEST = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestStartupPermissions();
    }

    private void requestStartupPermissions() {
        List<String> permissions = new ArrayList<>();

        addIfMissing(permissions, Manifest.permission.CAMERA);
        addIfMissing(permissions, Manifest.permission.ACCESS_COARSE_LOCATION);
        addIfMissing(permissions, Manifest.permission.ACCESS_FINE_LOCATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            addIfMissing(permissions, Manifest.permission.POST_NOTIFICATIONS);
            addIfMissing(permissions, Manifest.permission.READ_MEDIA_IMAGES);
            addIfMissing(permissions, Manifest.permission.READ_MEDIA_VIDEO);
            addIfMissing(permissions, Manifest.permission.READ_MEDIA_AUDIO);
        } else {
            addIfMissing(permissions, Manifest.permission.READ_EXTERNAL_STORAGE);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            addIfMissing(permissions, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            addIfMissing(permissions, Manifest.permission.BLUETOOTH_CONNECT);
            addIfMissing(permissions, Manifest.permission.BLUETOOTH_SCAN);
        }

        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissions.toArray(new String[0]),
                STARTUP_PERMISSION_REQUEST
            );
        }
    }

    private void addIfMissing(List<String> permissions, String permission) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(permission);
        }
    }
}
