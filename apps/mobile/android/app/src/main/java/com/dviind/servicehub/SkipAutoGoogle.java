package com.dviind.servicehub;

import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;

/**
 * 통합 로그인 화면(dvi-last-method.js)은 지난번에 Google 로 들어온 사람이면 Google 버튼을 대신 누른다.
 * 앱은 로그인 화면부터 보여 준다 — 그 스크립트가 "1분 안에 이미 눌렀다"로 보고 건너뛰게 표시를 미리 남긴다.
 * shortcut: 스크립트의 sessionStorage 키에 기대고 있다, 키가 바뀌면 다시 Google 로 바로 간다(깨지지는 않는다).
 * 서버가 앱을 알아보고 건너뛰게 바꾸면 이 파일을 지운다.
 */
final class SkipAutoGoogle {

    private static final String SCRIPT = "try { sessionStorage.setItem('dvi-auto-google', String(Date.now())) } catch (_) {}";

    private SkipAutoGoogle() {}

    static void install(WebView webView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        WebViewCompat.addDocumentStartJavaScript(webView, SCRIPT, Collections.singleton("https://api.dvi-ind.com"));
    }
}
