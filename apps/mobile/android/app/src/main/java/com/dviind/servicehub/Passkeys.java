package com.dviind.servicehub;

import android.webkit.WebView;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

/**
 * 통합 로그인의 2차 인증(패스키 · 보안 키). WebView 는 기본으로 꺼져 있다.
 * 이 앱으로 패스키를 꺼내려면 api.dvi-ind.com/.well-known/assetlinks.json 에 앱(패키지 · 서명)이 올라가 있어야 한다.
 */
final class Passkeys {

    private Passkeys() {}

    static void enable(WebView webView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_AUTHENTICATION)) return;
        WebSettingsCompat.setWebAuthenticationSupport(webView.getSettings(), WebSettingsCompat.WEB_AUTHENTICATION_SUPPORT_FOR_APP);
    }
}
