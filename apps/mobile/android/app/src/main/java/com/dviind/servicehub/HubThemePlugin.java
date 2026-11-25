package com.dviind.servicehub;

import android.content.res.Configuration;
import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 상태 표시줄 · 아래 내비 바 바탕을 허브 테마 색으로 칠한다 — 웹(usePortalTheme)이 테마를 바꿀 때 부른다.
 * WebView 140 아래는 Capacitor 가 페이지를 바 뒤로 그리지 않고 창에 여백을 줘서, 바 바탕이 창 색(휴대폰 설정)이 된다.
 * 140 이상은 웹이 바 뒤까지 그려 이 색은 가려진다.
 * Capacitor SystemBars 는 아이콘 색을 바꿀 때마다(화면 설정이 바뀔 때도) 창 색을 기본값으로 되돌린다 — 그 뒤에 다시 칠한다
 */
@CapacitorPlugin(name = "HubTheme")
public class HubThemePlugin extends Plugin {

    private Integer color;

    @PluginMethod
    public void setBackground(PluginCall call) {
        try {
            color = Color.parseColor(call.getString("color", ""));
        } catch (IllegalArgumentException e) {
            call.reject("color 는 #rrggbb 여야 한다");
            return;
        }
        getBridge().executeOnMainThread(() -> {
            paint();
            call.resolve();
        });
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        // SystemBars 도 같은 때 창 색을 되돌린다 — 어느 쪽이 먼저 불릴지 몰라 한 번 미뤄 그 뒤에 칠한다
        getActivity().getWindow().getDecorView().post(this::paint);
    }

    private void paint() {
        if (color != null) getActivity().getWindow().getDecorView().setBackgroundColor(color);
    }
}
