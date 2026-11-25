package com.dviind.servicehub;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/** 배포된 허브를 띄우는 껍데기(ADR 0007). WebView 에 거는 설정은 하나씩 자기 파일에 둔다 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HubThemePlugin.class);
        registerPlugin(IntentLinks.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        Passkeys.enable(webView);
        SkipAutoGoogle.install(webView);
    }
}
