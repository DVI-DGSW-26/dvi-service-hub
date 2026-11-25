package com.dviind.servicehub;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.CookieManager;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 스토어 없이 앱이 스스로 새 버전으로 바뀐다 — 웹(useAppUpdate)이 허브의 새 APK 주소로 부른다.
 * APK 는 로그인한 사람만 받게 허브(/app/)에 두어, WebView 의 로그인 쿠키를 붙여 받는다.
 * Android 12+ 는 앱이 자기 자신을 고칠 때 확인 창 없이 깔린다(setRequireUserAction). 그 아래이거나 시스템이 확인을 원하면 확인 창이 한 번 뜬다.
 * 처음 한 번은 '이 앱에서 설치 허용'을 켜야 한다 — 설정 화면을 열고, 켜고 돌아오면 이어서 받는다.
 * 다 깔리면 시스템이 앱을 닫는다(새 버전으로 바뀐다)
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String ACTION = "com.dviind.servicehub.UPDATE_STATUS";

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url", "");
        // 앱이 띄운 허브(capacitor.config 의 server.url) 밖에서 받은 APK 는 깔지 않는다
        String base = getBridge().getServerUrl();
        if (base == null || !url.startsWith(base.replaceAll("/+$", "") + "/")) {
            call.reject("허브 주소의 APK 만 받는다");
            return;
        }
        if (!getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            startActivityForResult(call, intent, "afterPermission");
            return;
        }
        new Thread(() -> download(call, url)).start();
    }

    @ActivityCallback
    private void afterPermission(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (!getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("설치 허용이 꺼져 있다", "NO_PERMISSION");
            return;
        }
        String url = call.getString("url", "");
        new Thread(() -> download(call, url)).start();
    }

    private void download(PluginCall call, String url) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            // 로그인이 풀렸으면 middleware 가 로그인 화면으로 보내지 않고 401 을 주게 — 받은 HTML 을 APK 로 깔려 하지 않는다
            conn.setRequestProperty("Accept", "application/vnd.android.package-archive");
            conn.setInstanceFollowRedirects(false);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null) conn.setRequestProperty("Cookie", cookie);
            if (conn.getResponseCode() != 200) {
                call.reject("APK 를 받지 못했다(" + conn.getResponseCode() + ")");
                return;
            }
            PackageInstaller installer = getContext().getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            params.setAppPackageName(getContext().getPackageName());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
            int id = installer.createSession(params);
            try (PackageInstaller.Session session = installer.openSession(id)) {
                try (InputStream in = conn.getInputStream(); OutputStream out = session.openWrite("app.apk", 0, conn.getContentLengthLong())) {
                    byte[] buf = new byte[64 * 1024];
                    for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
                    session.fsync(out);
                }
                listen(call);
                Intent status = new Intent(ACTION).setPackage(getContext().getPackageName());
                int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0);
                session.commit(PendingIntent.getBroadcast(getContext(), id, status, flags).getIntentSender());
            }
        } catch (Exception e) {
            call.reject("업데이트를 깔지 못했다: " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** 설치 결과 — 확인이 필요하면 시스템 확인 창을 띄운다. 성공하면 앱이 닫혀 여기까지 오지 않는다 */
    private void listen(PluginCall call) {
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
                if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                    Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
                    if (confirm != null) getActivity().startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    return;
                }
                context.unregisterReceiver(this);
                if (status == PackageInstaller.STATUS_SUCCESS) call.resolve();
                else call.reject("업데이트를 깔지 못했다: " + intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE), status == PackageInstaller.STATUS_FAILURE_ABORTED ? "CANCELLED" : null);
            }
        };
        ContextCompat.registerReceiver(getContext(), receiver, new IntentFilter(ACTION), ContextCompat.RECEIVER_NOT_EXPORTED);
    }
}
