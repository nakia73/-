
import { Language } from '../types';

export const translations = {
  en: {
    // Common
    common_close: "Close",
    common_save: "Save Settings",
    common_saving: "Saving...",
    common_cancel: "Cancel",
    common_confirm: "Confirm",
    common_change: "Change",
    common_delete: "Delete",
    common_edit: "Edit",
    common_copy: "Copy",
    common_error: "Error",
    common_success: "Success",
    common_back: "Back",
    
    // Navigation
    nav_generate: "Generate",
    nav_assets: "Assets",
    nav_voice: "Voice",
    nav_settings: "Settings",
    
    // App Header
    app_system_status: "SONIC-GEN SYSTEM",
    app_online: "ONLINE",
    app_cluster_status: "Cluster Status",
    app_welcome_title: "Sonic-GEN",
    app_welcome_desc: "Multi-model video generation platform powered by Veo 3 & Sora 2.",
    
    // Generator Form
    gen_title: "Video Generation",
    gen_model_veo_fast: "Veo 3 Fast",
    gen_model_veo_hq: "Veo 3 Quality",
    gen_model_sora: "Sora 2",
    gen_model_sora_pro: "Sora 2 Pro",
    
    gen_cost_veo_fast: "60 Credits ($0.30)",
    gen_cost_veo_hq: "250 Credits ($1.25)",
    gen_cost_sora: "30 Credits ($0.15) / 10s",
    gen_cost_sora_pro: "250 Credits ($1.25) / 10s",

    gen_veo_fast_desc: "Google Veo: Fast generation",
    gen_veo_hq_desc: "Google Veo: Best quality (1080p)",
    gen_sora_desc: "OpenAI Sora: Realistic motion",
    gen_sora_pro_desc: "OpenAI Sora: Professional grade",

    gen_tab_text: "Text to Video",
    gen_tab_image: "Image to Video",
    gen_tab_director: "Director Mode",
    
    gen_start_frame_url: "Start Frame / Image",
    gen_end_frame_url: "End Frame (Veo Only)",
    gen_prompt_label: "Prompt", 
    gen_prompt_placeholder: "Describe your video concept here...",
    gen_aspect_ratio: "Aspect Ratio",
    gen_resolution: "Resolution",
    gen_duration: "Duration",
    gen_quality: "Quality",
    gen_watermark: "Remove Watermark",
    gen_queue_btn: "ADD TO QUEUE",
    gen_upload_img: "Upload Image",
    gen_upload_placeholder: "Click to upload or drop image",
    gen_uploading: "Uploading...",
    gen_processing_img: "Formatting for Sora...",
    gen_no_key: "Active API Key required. Please configure in Settings.",
    gen_no_gemini_key: "Gemini API Key required for prompt generation.",

    // Dropdown Options
    gen_opt_landscape: "16:9 (Landscape)",
    gen_opt_portrait: "9:16 (Portrait)",
    gen_opt_10s: "10 Seconds",
    gen_opt_15s: "15 Seconds (1.5x Cost)",
    gen_opt_720p: "720p (Standard)",
    gen_opt_1080p: "1080p (HQ)",
    gen_opt_std: "Standard",
    gen_opt_hq: "High Quality",
    
    // Advanced Prompt Config - STRICTLY SEPARATED
    adv_title_gen: "Prompt Creation", // For Text/Image Mode
    adv_title_director: "Detail Settings", // For Director Mode
    
    adv_lang: "Prompt Language",
    adv_lang_ja: "Japanese",
    adv_lang_en: "English",
    adv_lang_ko: "Korean",
    adv_lang_zh_cn: "Chinese (Simplified)",
    adv_lang_zh_tw: "Chinese (Traditional)",
    adv_lang_none: "None (Auto)",

    adv_text: "Overlay",
    adv_text_on: "On",
    adv_text_off: "Off",
    adv_audio: "Audio",
    adv_audio_dialogue: "Natural Dialogue",
    adv_audio_narration: "Narration",
    adv_audio_off: "Off",
    adv_timing: "Timing",
    adv_timing_json: "JSON Control",
    adv_timing_desc: "JSON timing for Sora Pro.",
    
    // Image Reference Mode
    adv_img_ref_mode: "Image Strategy",
    adv_img_mode_animate: "Animate",
    adv_img_mode_subject: "Subject Ref",
    adv_img_desc: "'Animate' keeps composition. 'Subject Ref' makes new scene.",

    // New Prompt Generation UI
    adv_gen_section: "Draft Input",
    adv_draft_label: "Draft Idea", 
    adv_draft_placeholder: "Draft Idea (e.g. Cat eating pizza...)",
    adv_meta_label: "Custom Prompt", 
    adv_meta_placeholder: "Define how the AI should write the prompt...",
    adv_btn_generate: "Generate Prompt",
    
    // Quality Warning Modal
    warn_title: "High Cost Warning",
    warn_desc: "The selected model consumes significantly more credits than standard models.",
    warn_cost_comparison: "Standard: ~30-60 credits ($0.15-0.30) vs Pro/Quality: 250 credits ($1.25)",
    warn_dont_show: "Don't show this again",
    warn_btn_cancel: "Cancel",
    warn_btn_confirm: "Proceed",

    // Director Mode
    dir_concept_label: "Project Concept", // Specific label for Director Mode
    dir_idea_placeholder: "E.g. A cyberpunk trailer about a robot detective...",
    dir_count_label: "Scene Count",
    dir_image_label: "Reference Image (Optional)",
    dir_image_desc: "Applied to all scenes as start frame.",
    dir_img_change: "Change Image",
    dir_use_image: "Use Reference Image",
    dir_img_strategy: "Image Processing",
    dir_btn_plan: "Generate Multiple Prompts",
    dir_planning: "Generating multiple prompts...",
    dir_review_title: "Production Plan Review",
    dir_review_desc: "Review prompts and image settings before batch generation.",
    dir_prod_settings: "Production Settings",
    dir_scene: "SCENE",
    dir_btn_execute: "BATCH GENERATE ALL",
    dir_btn_back: "Back to Idea",
    dir_conf_title: "Confirm Batch Generation",
    dir_conf_desc: "You are about to queue multiple video generation tasks.",
    dir_conf_count: "Total Scenes:",
    dir_conf_model: "Model:",
    dir_conf_est: "Estimated Cost:",
    dir_conf_credits: "Credits",
    dir_conf_btn: "Confirm & Charge",
    
    dir_persona_label: "Custom Prompt", 
    dir_tmpl_edit: "Edit",
    dir_tmpl_name: "Template Name",
    dir_tmpl_prompt: "System Prompt (Custom Instruction)",
    dir_tmpl_save: "Save Template",
    dir_tmpl_delete: "Delete",
    dir_tmpl_default: "(Default)",
    
    // Shared Modal Actions
    modal_select_edit: "Select to edit...",
    modal_new_tmpl: "+ New",
    modal_save_as_new: "Save as New",
    modal_update: "Update",
    modal_create: "Create",

    // History Sidebar
    hist_queue: "Queue",
    hist_empty: "Queue is empty",
    hist_retry: "Retry",
    hist_history: "History",
    hist_select_all: "Select All",
    hist_deselect_all: "Deselect All",
    hist_download_selected: "Download Selected",
    hist_no_videos: "No history",
    hist_missing_file: "File missing",
    hist_missing_desc: "Local file not found. URL might be expired.",
    hist_link: "Link",
    hist_try_link: "Try Original Link (May be expired)",

    // Video Player
    player_generated: "Generated Result",
    
    // API Manager / Settings
    api_title: "Settings & Cluster",
    api_desc: "Configure global settings and API processing nodes.",
    api_section_general: "Global Configuration",
    api_section_llm: "LLM Configuration (Gemini)",
    api_section_cluster: "Sonic-GEN API Cluster (Veo & Sora)",
    api_get_key: "Get API Key",
    
    api_gemini_label: "Google Gemini API Key",
    api_gemini_placeholder: "Enter Gemini API Key (starts with AIza...)",
    api_gemini_desc: "Required for Prompt Generation and Director Mode planning.",
    api_gemini_link: "Get Gemini Key",

    api_node: "NODE",
    api_running: "RUNNING",
    api_offline: "OFFLINE",
    api_placeholder: "Enter Kie.ai API Key",
    api_account_label: "Account Name (Optional)",
    api_account_tooltip: "Use same name to group credits for same account",
    api_total: "Total Gen",
    api_status: "Status",
    api_legend_idle: "Idle",
    api_legend_proc: "Processing",
    api_legend_err: "Error/Cooldown",
    
    api_refresh_balance: "Refresh Credits",
    api_remaining: "Credits:",
    api_top_up: "Top Up",
    api_total_bal: "Total Cluster Balance",
    api_credits: "Credits",

    api_local_hist_label: "Enable Local History (IndexedDB)",
    api_local_hist_desc: "Save generated videos to browser storage. Allows playback even after link expiration.",

    // API Modal
    modal_title: "Welcome to Sonic-GEN",
    modal_desc: "To generate high-quality AI videos using Veo 3 and Sora 2, you need to configure your Kie.ai API Key.",
    modal_btn: "Configure Settings",
    modal_agree: "By continuing, you agree to the terms of service.",
    modal_billing: "View Billing Documentation",
    modal_error_expired: "Session expired.",
    modal_error_fail: "Failed.",

    // Auth
    auth_login_title: "Login to Veo Cloud",
    auth_signup_title: "Create Account",
    auth_google: "Sign in with Google",
    auth_or_email: "Or continue with email",
    auth_email: "Email",
    auth_password: "Password",
    auth_btn_login: "Login",
    auth_btn_signup: "Sign Up",
    auth_processing: "Processing...",
    auth_switch_signup: "Don't have an account? Sign Up",
    auth_switch_login: "Already have an account? Login",
    auth_sync_btn: "Login / Sync",
    auth_syncing_to: "Syncing to:",
    auth_signed_in_as: "Signed in as",
    auth_sign_out: "Sign Out",
  },
  ja: {
    // Common
    common_close: "閉じる",
    common_save: "設定を保存",
    common_saving: "保存中...",
    common_cancel: "キャンセル",
    common_confirm: "確認",
    common_change: "変更",
    common_delete: "削除",
    common_edit: "編集",
    common_copy: "コピー",
    common_error: "エラー",
    common_success: "成功",
    common_back: "戻る",

    // Navigation
    nav_generate: "生成",
    nav_assets: "アセット",
    nav_voice: "音声",
    nav_settings: "設定",
    
    // App Header
    app_system_status: "SONIC-GEN SYSTEM",
    app_online: "稼働中",
    app_cluster_status: "クラスタ状態",
    app_welcome_title: "Sonic-GEN",
    app_welcome_desc: "Veo 3 & Sora 2 搭載。マルチモデル動画生成プラットフォーム。",
    
    // Generator Form
    gen_title: "動画生成",
    gen_model_veo_fast: "Veo 3 Fast",
    gen_model_veo_hq: "Veo 3 Quality",
    gen_model_sora: "Sora 2",
    gen_model_sora_pro: "Sora 2 Pro",
    
    gen_cost_veo_fast: "60 クレジット ($0.30)",
    gen_cost_veo_hq: "250 クレジット ($1.25)",
    gen_cost_sora: "30 クレジット ($0.15) / 10秒",
    gen_cost_sora_pro: "250 クレジット ($1.25) / 10秒",

    gen_veo_fast_desc: "Google Veo: 高速生成",
    gen_veo_hq_desc: "Google Veo: 最高品質 (1080p)",
    gen_sora_desc: "OpenAI Sora: リアルな動きと物理演算",
    gen_sora_pro_desc: "OpenAI Sora: プロフェッショナル向け",

    gen_tab_text: "テキストから動画",
    gen_tab_image: "画像から動画",
    gen_tab_director: "ディレクターモード",

    gen_start_frame_url: "開始フレーム / 画像",
    gen_end_frame_url: "終了フレーム (Veoのみ)",
    gen_prompt_label: "プロンプト", 
    gen_prompt_placeholder: "動画のプロンプトや詳細を入力してください...",
    gen_aspect_ratio: "アスペクト比",
    gen_resolution: "解像度",
    gen_duration: "動画の長さ",
    gen_quality: "画質設定",
    gen_watermark: "透かし削除 (Watermark)",
    gen_queue_btn: "キューに追加",
    gen_upload_img: "画像アップロード",
    gen_upload_placeholder: "クリックまたはドロップして画像をアップロード",
    gen_uploading: "アップロード中...",
    gen_processing_img: "Sora用に整形中...",
    gen_no_key: "有効なAPIキーが必要です。設定画面を確認してください。",
    gen_no_gemini_key: "プロンプト生成にはGemini APIキーが必要です。",

    // Dropdown Options
    gen_opt_landscape: "16:9 (横長)",
    gen_opt_portrait: "9:16 (縦長)",
    gen_opt_10s: "10秒",
    gen_opt_15s: "15秒 (1.5倍コスト)",
    gen_opt_720p: "720p (標準)",
    gen_opt_1080p: "1080p (高画質)",
    gen_opt_std: "標準",
    gen_opt_hq: "高品質",

    // Advanced Prompt Config - STRICTLY SEPARATED
    adv_title_gen: "プロンプト作成", // Standard Mode
    adv_title_director: "詳細設定", // Director Mode
    
    adv_lang: "プロンプト言語",
    adv_lang_ja: "日本語",
    adv_lang_en: "英語",
    adv_lang_ko: "韓国語",
    adv_lang_zh_cn: "中国語 (簡体字)",
    adv_lang_zh_tw: "中国語 (繁体字)",
    adv_lang_none: "指定なし (自動)",

    adv_text: "テロップ",
    adv_text_on: "あり",
    adv_text_off: "なし",
    adv_audio: "音声",
    adv_audio_dialogue: "自然な会話",
    adv_audio_narration: "ナレーション",
    adv_audio_off: "なし",
    adv_timing: "時間制御",
    adv_timing_json: "JSON制御",
    adv_timing_desc: "Sora Pro用",
    
    // Image Reference Mode
    adv_img_ref_mode: "画像参照",
    adv_img_mode_animate: "そのまま (Animate)",
    adv_img_mode_subject: "被写体のみ (Ref)",
    adv_img_desc: "「そのまま」は構図維持。「被写体」は新規シーン。",

    // New Prompt Generation UI
    adv_gen_section: "ドラフト入力",
    adv_draft_label: "ドラフト", 
    adv_draft_placeholder: "アイデア (例: ピザを食べる猫...)",
    adv_meta_label: "カスタムプロンプト", 
    adv_meta_placeholder: "AIがどのようにプロンプトを書くべきかを定義します...",
    adv_btn_generate: "プロンプト生成",

    // Quality Warning Modal
    warn_title: "高コスト警告",
    warn_desc: "選択されたモデルは、標準モデルと比較して大幅に多くのクレジットを消費します。",
    warn_cost_comparison: "標準: ~30-60クレジット ($0.15-0.30) vs Pro/Quality: 250クレジット ($1.25)",
    warn_dont_show: "今後表示しない",
    warn_btn_cancel: "キャンセル",
    warn_btn_confirm: "承認して続行",

    // Director Mode
    dir_concept_label: "作品のコンセプト", // Specific label for Director Mode
    dir_idea_placeholder: "例: ロボット探偵が活躍するサイバーパンク映画の予告編...",
    dir_count_label: "シーン数（目標）",
    dir_image_label: "参照画像 (任意)",
    dir_image_desc: "全シーンの開始フレームとして適用されます。",
    dir_img_change: "画像を変更",
    dir_use_image: "参照画像を使用",
    dir_img_strategy: "画像処理設定",
    dir_btn_plan: "プロンプト一括生成",
    dir_planning: "プロンプト一括生成中...",
    dir_review_title: "構成レビュー",
    dir_review_desc: "プロンプトや画像使用設定を確認・編集してください。",
    dir_prod_settings: "制作設定 (Production Settings)",
    dir_scene: "シーン",
    dir_btn_execute: "全て一括生成を実行",
    dir_btn_back: "企画に戻る",
    dir_conf_title: "一括生成の確認",
    dir_conf_desc: "複数の動画生成タスクを一括でキューに追加します。以下の見積もりを確認してください。",
    dir_conf_count: "総シーン数:",
    dir_conf_model: "使用モデル:",
    dir_conf_est: "見積もり合計:",
    dir_conf_credits: "クレジット",
    dir_conf_btn: "承認して実行",
    
    dir_persona_label: "カスタムプロンプト",
    dir_tmpl_edit: "編集",
    dir_tmpl_name: "テンプレート名",
    dir_tmpl_prompt: "システムプロンプト (カスタム指示)",
    dir_tmpl_save: "テンプレートを保存",
    dir_tmpl_delete: "削除",
    dir_tmpl_default: "(デフォルト)",
    
    // Shared Modal Actions
    modal_select_edit: "編集するテンプレートを選択...",
    modal_new_tmpl: "+ 新規作成",
    modal_save_as_new: "別名で保存",
    modal_update: "更新",
    modal_create: "作成",

    // History Sidebar
    hist_queue: "処理キュー",
    hist_empty: "キューは空です",
    hist_retry: "再試行",
    hist_history: "生成履歴",
    hist_select_all: "全選択",
    hist_deselect_all: "全選択解除",
    hist_download_selected: "一括ダウンロード",
    hist_no_videos: "履歴なし",
    hist_missing_file: "ファイルなし",
    hist_missing_desc: "ローカルに保存されていません。URL期限切れの可能性があります。",
    hist_link: "リンク",
    hist_try_link: "元リンクを開く (期限切れの可能性あり)",

    // Video Player
    player_generated: "生成結果",
    
    // API Manager / Settings
    api_title: "設定 & クラスタ管理",
    api_desc: "全体設定および並列処理ノードの設定を行います。",
    api_section_general: "全体設定",
    api_section_llm: "LLM 設定 (Gemini)",
    api_section_cluster: "Sonic-GEN API クラスタ (Veo & Sora)",
    api_get_key: "キーを取得",
    
    api_gemini_label: "Google Gemini API キー",
    api_gemini_placeholder: "Gemini API キーを入力 (AIza...)",
    api_gemini_desc: "プロンプト生成およびディレクターモードの計画作成に必要です。",
    api_gemini_link: "Geminiキーを取得",
    
    api_node: "ノード",
    api_running: "実行中",
    api_offline: "オフライン",
    api_placeholder: "Kie.ai APIキーを入力",
    api_account_label: "アカウント名 (任意)",
    api_account_tooltip: "同一アカウントの場合は同じ名前を入力して残高を統合",
    api_total: "生成数",
    api_status: "状態",
    api_legend_idle: "待機中",
    api_legend_proc: "処理中",
    api_legend_err: "エラー/冷却中",
    
    api_refresh_balance: "残高を更新",
    api_remaining: "残高:",
    api_top_up: "チャージ",
    api_total_bal: "クラスタ残高合計",
    api_credits: "クレジット",

    api_local_hist_label: "ローカル履歴保存 (IndexedDB)",
    api_local_hist_desc: "生成された動画をブラウザ内に保存します。URL期限切れ後も再生可能になります。",

    // API Modal
    modal_title: "Sonic-GENへようこそ",
    modal_desc: "高品質なAI動画を生成するには、Kie.ai APIキーを設定してください。",
    modal_btn: "設定画面を開く",
    modal_agree: "続行することで、利用規約に同意したものとみなされます。",
    modal_billing: "請求ドキュメントを表示",
    modal_error_expired: "セッション切れです。",
    modal_error_fail: "失敗しました。",

    // Auth
    auth_login_title: "Veo Cloudへログイン",
    auth_signup_title: "アカウント作成",
    auth_google: "Googleでログイン",
    auth_or_email: "またはメールアドレスで続行",
    auth_email: "メールアドレス",
    auth_password: "パスワード",
    auth_btn_login: "ログイン",
    auth_btn_signup: "登録",
    auth_processing: "処理中...",
    auth_switch_signup: "アカウントをお持ちでないですか？ 登録",
    auth_switch_login: "すでにアカウントをお持ちですか？ ログイン",
    auth_sync_btn: "ログイン・同期",
    auth_syncing_to: "同期中:",
    auth_signed_in_as: "ログイン中:",
    auth_sign_out: "ログアウト",
  }
};