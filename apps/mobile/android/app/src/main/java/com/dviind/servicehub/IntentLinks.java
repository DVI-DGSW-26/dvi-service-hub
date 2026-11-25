package com.dviind.servicehub;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URISyntaxException;

/**
 * 웹의 intent:// 링크(빠른 바로가기의 플로우 · Gmail 앱 열기)를 Chrome 처럼 연다 — Capacitor 는 그 스킴을 몰라 아무 일도 안 한다.
 * 앱이 없거나 주소를 못 받으면 S.browser_fallback_url(웹 주소)을 시스템 브라우저로 연다.
 * Chrome 과 같이 컴포넌트 · 셀렉터를 지우고 BROWSABLE 만 열게 해, 링크가 이 앱이나 다른 앱의 내부 화면을 부르지 못하게 한다
 */
@CapacitorPlugin(name = "IntentLinks")
public class IntentLinks extends Plugin {

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (!"intent".equals(url.getScheme())) return null;
        Intent intent;
        try {
            intent = Intent.parseUri(url.toString(), Intent.URI_INTENT_SCHEME);
        } catch (URISyntaxException e) {
            return true;
        }
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        intent.setComponent(null);
        intent.setSelector(null);
        try {
            getActivity().startActivity(intent);
        } catch (ActivityNotFoundException e) {
            String fallback = intent.getStringExtra("browser_fallback_url");
            if (fallback != null && fallback.startsWith("https://")) {
                try {
                    getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)));
                } catch (ActivityNotFoundException ignored) {
                    // 브라우저도 없으면 할 수 있는 게 없다
                }
            }
        } catch (RuntimeException e) {
            // file:// (FileUriExposedException) · 권한이 막힌 대상(SecurityException) — 못 여는 링크로 앱이 죽지 않게 버린다
        }
        return true;
    }
}
