package id.marala.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * MaralaKU untuk Android: membuka situs MaralaKU di layar penuh.
 * Semua isi dan pembaruan datang dari server, jadi APK ini jarang perlu diganti.
 */
public class MainActivity extends Activity {
    private static final int REQUEST_FILE = 1;
    private static final int REQUEST_CAMERA = 2;
    private static final int REQUEST_STORAGE = 3;

    private WebView web;
    private ProgressBar progress;
    private View offline;
    private String failedUrl;
    private String bridgeScript = "";
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest cameraRequest;
    private WebView printView;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        bridgeScript = readAsset("bridge.js");

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.brand));
        FrameLayout content = new FrameLayout(this);
        content.setBackgroundColor(getColor(R.color.paper));
        root.addView(content, match());

        web = new WebView(this);
        content.addView(web, match());

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(ColorStateList.valueOf(getColor(R.color.brand_light)));
        progress.setVisibility(View.GONE);
        content.addView(progress, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP));

        offline = buildOfflineView();
        offline.setVisibility(View.GONE);
        content.addView(offline, match());

        setContentView(root);
        applyInsets(root);
        setupWebView();

        if (state == null || web.restoreState(state) == null) {
            web.loadUrl(BuildConfig.APP_URL + "/workspace");
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportMultipleWindows(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " MaralaKU-Android/" + BuildConfig.VERSION_NAME);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        web.addJavascriptInterface(new Bridge(), "MaralaAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (isOwnSite(Uri.parse(url))) view.evaluateJavascript(bridgeScript, null);
                CookieManager.getInstance().flush();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    failedUrl = request.getUrl().toString();
                    offline.setVisibility(View.VISIBLE);
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value < 100 ? View.VISIBLE : View.GONE);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleCameraRequest(request));
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (cameraRequest == request) cameraRequest = null;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQUEST_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    toast("Tidak ada aplikasi untuk memilih berkas.");
                    return false;
                }
                return true;
            }
        });

        // Unduhan biasa (bukan lewat link yang ditangkap bridge.js) diambil oleh halaman agar sesi login ikut terkirim.
        web.setDownloadListener((url, userAgent, disposition, mime, length) -> {
            String name = URLUtil.guessFileName(url, disposition, mime);
            web.evaluateJavascript("window.__maralaDownload&&window.__maralaDownload(" + jsString(url) + "," + jsString(name) + ")", null);
        });
    }

    private boolean isOwnSite(Uri uri) {
        String scheme = uri.getScheme();
        return ("https".equals(scheme) || "http".equals(scheme)) && BuildConfig.APP_HOST.equalsIgnoreCase(uri.getHost());
    }

    /** Halaman MaralaKU dibuka di aplikasi; link lain (WhatsApp, Maps, telepon) dibuka aplikasinya masing-masing. */
    private boolean handleUrl(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        if (isOwnSite(uri) || scheme.equals("about") || scheme.equals("blob") || scheme.equals("data")) return false;
        openExternal(uri.toString());
        return true;
    }

    private void openExternal(String url) {
        Intent intent;
        try {
            if (url.startsWith("intent:")) {
                intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
                try {
                    startActivity(intent);
                } catch (ActivityNotFoundException e) {
                    String fallback = intent.getStringExtra("browser_fallback_url");
                    if (fallback != null) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fallback)));
                    else throw e;
                }
                return;
            }
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            toast("Tidak ada aplikasi untuk membuka link ini.");
        }
    }

    private void handleCameraRequest(PermissionRequest request) {
        boolean wantsCamera = false;
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsCamera = true;
        }
        if (!wantsCamera || !isOwnSite(request.getOrigin())) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            cameraRequest = request;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA);
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (code == REQUEST_CAMERA && cameraRequest != null) {
            if (granted) cameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else {
                cameraRequest.deny();
                toast("Izin kamera ditolak. Kode bisa diketik manual.");
            }
            cameraRequest = null;
        } else if (code == REQUEST_STORAGE) {
            toast(granted ? "Izin diberikan. Silakan unduh lagi." : "Izin penyimpanan ditolak.");
        }
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == REQUEST_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        }
    }

    /** Fungsi yang bisa dipanggil halaman lewat window.MaralaAndroid (lihat assets/bridge.js). */
    private class Bridge {
        @JavascriptInterface
        public void saveFile(String name, String mime, String base64) {
            byte[] bytes;
            try {
                bytes = Base64.decode(base64, Base64.DEFAULT);
            } catch (IllegalArgumentException e) {
                toast("Berkas rusak, coba unduh lagi.");
                return;
            }
            runOnUiThread(() -> writeDownload(name, mime, bytes));
        }

        @JavascriptInterface
        public void printPage(String title) {
            runOnUiThread(() -> print(web, title));
        }

        @JavascriptInterface
        public void printHtml(String html, String title) {
            runOnUiThread(() -> {
                WebView view = new WebView(MainActivity.this);
                printView = view;
                view.setWebViewClient(new WebViewClient() {
                    private boolean done;

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                        return true;
                    }

                    @Override
                    public void onPageFinished(WebView v, String url) {
                        if (done) return;
                        done = true;
                        print(v, title);
                    }
                });
                view.loadDataWithBaseURL(BuildConfig.APP_URL + "/", html, "text/html", "UTF-8", null);
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            runOnUiThread(() -> {
                Uri uri = Uri.parse(url);
                if (isOwnSite(uri)) web.loadUrl(url);
                else openExternal(url);
            });
        }

        @JavascriptInterface
        public void copy(String text) {
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("MaralaKU", text));
                if (Build.VERSION.SDK_INT < 33) toast("Disalin.");
            });
        }

        @JavascriptInterface
        public void toast(String message) {
            MainActivity.this.toast(message);
        }
    }

    private void print(WebView view, String title) {
        String job = (title == null || title.trim().isEmpty() ? "MaralaKU" : title.trim()).replaceAll("[\\\\/:*?\"<>|]+", "_");
        PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
        try {
            manager.print(job, view.createPrintDocumentAdapter(job), new PrintAttributes.Builder().build());
        } catch (Exception e) {
            toast("Tidak bisa membuka menu cetak.");
        }
    }

    private void writeDownload(String name, String mime, byte[] bytes) {
        String safe = name.replaceAll("[\\\\/:*?\"<>|]+", "_");
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                values.put(MediaStore.Downloads.MIME_TYPE, mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MaralaKU");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("insert");
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("stream");
                    out.write(bytes);
                }
            } else {
                if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQUEST_STORAGE);
                    return;
                }
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "MaralaKU");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("mkdir");
                try (FileOutputStream out = new FileOutputStream(new File(dir, safe))) {
                    out.write(bytes);
                }
            }
            Toast.makeText(this, "Tersimpan di Download/MaralaKU: " + safe, Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            toast("Gagal menyimpan berkas.");
        }
    }

    private View buildOfflineView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(32), dp(32), dp(32), dp(32));
        box.setBackgroundColor(getColor(R.color.paper));
        box.setClickable(true);

        TextView title = new TextView(this);
        title.setText("Tidak bisa terhubung");
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextColor(0xFF0E2238);
        title.setGravity(Gravity.CENTER);
        box.addView(title);

        TextView body = new TextView(this);
        body.setText("Periksa koneksi internet, lalu coba lagi. Data yang sudah tersimpan tetap aman di server.");
        body.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        body.setTextColor(0xFF4A5B70);
        body.setGravity(Gravity.CENTER);
        body.setPadding(0, dp(8), 0, dp(20));
        box.addView(body);

        Button retry = new Button(this);
        retry.setText("Coba lagi");
        retry.setAllCaps(false);
        retry.setTextColor(0xFFFFFFFF);
        retry.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.brand)));
        retry.setOnClickListener(v -> {
            offline.setVisibility(View.GONE);
            if (failedUrl != null) web.loadUrl(failedUrl);
            else web.reload();
        });
        box.addView(retry, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return box;
    }

    /** Android 15 menggambar aplikasi sampai ke bawah status bar; beri jarak agar isi tidak tertutup. */
    private void applyInsets(View root) {
        if (Build.VERSION.SDK_INT < 35) return;
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsets.CONSUMED;
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (offline.getVisibility() == View.VISIBLE) {
            super.onBackPressed();
            return;
        }
        Uri current = Uri.parse(web.getUrl() == null ? "" : web.getUrl());
        String path = current.getPath() == null ? "" : current.getPath();
        // Dari halaman utama (ruang usaha atau login), tombol kembali menutup aplikasi, bukan kembali ke halaman login.
        if (path.equals("/workspace") || path.equals("/login") || !web.canGoBack()) {
            moveTaskToBack(true);
            return;
        }
        web.goBack();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        CookieManager.getInstance().flush();
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (printView != null) printView.destroy();
        web.destroy();
        super.onDestroy();
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            return "";
        }
    }

    private static String jsString(String value) {
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "") + "'";
    }

    private FrameLayout.LayoutParams match() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
