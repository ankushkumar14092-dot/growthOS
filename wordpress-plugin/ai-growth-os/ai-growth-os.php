<?php
/**
 * Plugin Name: AI-Growth-OS
 * Description: Safe apply / rollback bridge for AI-Growth-OS (health, apply_patch, rollback).
 * Version: 0.5.0
 * Author: AI-Growth-OS
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AIGOS_PLUGIN_VERSION', '0.5.0');
define('AIGOS_REST_NAMESPACE', 'ai-growth-os/v1');
define('AIGOS_OPTION_TOKEN', 'aigos_site_token');
define('AIGOS_OPTION_OVERRIDES', 'aigos_overrides');
define('AIGOS_OPTION_BACKUPS', 'aigos_patch_backups');

register_activation_hook(__FILE__, 'aigos_activate');

function aigos_activate(): void
{
    if (!get_option(AIGOS_OPTION_TOKEN)) {
        update_option(AIGOS_OPTION_TOKEN, aigos_generate_token(), true);
    }
    aigos_register_rewrites();
    flush_rewrite_rules();
}

function aigos_register_rewrites(): void
{
    add_rewrite_rule('^llms\.txt$', 'index.php?aigos_llms=1', 'top');
    add_rewrite_rule('^sitemap\.xml$', 'index.php?aigos_sitemap=1', 'top');
}

function aigos_generate_token(): string
{
    try {
        return bin2hex(random_bytes(24));
    } catch (Exception $e) {
        return wp_generate_password(48, false, false);
    }
}

add_action('admin_menu', function () {
    add_options_page(
        'AI-Growth-OS',
        'AI-Growth-OS',
        'manage_options',
        'ai-growth-os',
        'aigos_settings_page'
    );
});

function aigos_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    if (
        isset($_POST['aigos_rotate_token']) &&
        check_admin_referer('aigos_rotate_token')
    ) {
        update_option(AIGOS_OPTION_TOKEN, aigos_generate_token(), true);
        echo '<div class="notice notice-success"><p>Site token rotated. Update AI-Growth-OS connect settings.</p></div>';
    }

    $token = (string) get_option(AIGOS_OPTION_TOKEN, '');
    ?>
    <div class="wrap">
      <h1>AI-Growth-OS</h1>
      <p>Install this plugin, then paste the site token into AI-Growth-OS Connect.</p>
      <table class="form-table" role="presentation">
        <tr>
          <th scope="row">Site token</th>
          <td>
            <code style="user-select:all;word-break:break-all;"><?php echo esc_html($token); ?></code>
            <p class="description">Send as <code>Authorization: Bearer &lt;token&gt;</code> to plugin REST routes.</p>
          </td>
        </tr>
        <tr>
          <th scope="row">Health URL</th>
          <td><code><?php echo esc_html(rest_url(AIGOS_REST_NAMESPACE . '/health')); ?></code></td>
        </tr>
      </table>
      <form method="post">
        <?php wp_nonce_field('aigos_rotate_token'); ?>
        <p>
          <button type="submit" name="aigos_rotate_token" class="button button-secondary" value="1">
            Rotate token
          </button>
        </p>
      </form>
    </div>
    <?php
}

add_action('rest_api_init', function () {
    register_rest_route(AIGOS_REST_NAMESPACE, '/health', [
        'methods' => 'GET',
        'callback' => 'aigos_health',
        'permission_callback' => 'aigos_permission_check',
    ]);

    register_rest_route(AIGOS_REST_NAMESPACE, '/apply_patch', [
        'methods' => 'POST',
        'callback' => 'aigos_apply_patch',
        'permission_callback' => 'aigos_permission_check',
    ]);

    register_rest_route(AIGOS_REST_NAMESPACE, '/rollback', [
        'methods' => 'POST',
        'callback' => 'aigos_rollback',
        'permission_callback' => 'aigos_permission_check',
    ]);
});

/**
 * @return bool|WP_Error
 */
function aigos_permission_check()
{
    $header = isset($_SERVER['HTTP_AUTHORIZATION'])
        ? (string) $_SERVER['HTTP_AUTHORIZATION']
        : '';
    if ($header === '' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
        $stored = (string) get_option(AIGOS_OPTION_TOKEN, '');
        if ($stored !== '' && hash_equals($stored, $m[1])) {
            return true;
        }
        return new WP_Error('aigos_unauthorized', 'Invalid site token', ['status' => 401]);
    }

    if (is_user_logged_in() && current_user_can('edit_posts')) {
        return true;
    }

    return new WP_Error(
        'aigos_unauthorized',
        'Bearer site token or Application Password required',
        ['status' => 401]
    );
}

function aigos_detect_seo_plugin(): string
{
    if (defined('RANK_MATH_VERSION') || class_exists('RankMath')) {
        return 'rank_math';
    }
    if (defined('WPSEO_VERSION')) {
        return 'yoast';
    }
    return 'none';
}

function aigos_health()
{
    $writable = current_user_can('edit_posts');
    if (!$writable && !is_user_logged_in()) {
        $writable = true;
    }

    return rest_ensure_response([
        'ok' => true,
        'plugin_version' => AIGOS_PLUGIN_VERSION,
        'wp_version' => get_bloginfo('version'),
        'seo_plugin' => aigos_detect_seo_plugin(),
        'writable' => (bool) $writable,
    ]);
}

/**
 * Active SEO/meta overrides applied by AI-Growth-OS.
 *
 * @return array<string, mixed>
 */
function aigos_get_overrides(): array
{
    $raw = get_option(AIGOS_OPTION_OVERRIDES, []);
    return is_array($raw) ? $raw : [];
}

/**
 * @param array<string, mixed> $overrides
 */
function aigos_save_overrides(array $overrides): void
{
    update_option(AIGOS_OPTION_OVERRIDES, $overrides, false);
}

/**
 * @return array<string, mixed>
 */
function aigos_get_backups(): array
{
    $raw = get_option(AIGOS_OPTION_BACKUPS, []);
    return is_array($raw) ? $raw : [];
}

/**
 * @param array<string, mixed> $backups
 */
function aigos_save_backups(array $backups): void
{
    update_option(AIGOS_OPTION_BACKUPS, $backups, false);
}

/**
 * Map patch target → override slot used for HTML output + verification.
 *
 * @param array<string, mixed> $target
 */
function aigos_slot_for_target(array $target): string
{
    $type = isset($target['type']) ? (string) $target['type'] : '';
    $key = isset($target['key']) ? (string) $target['key'] : '';

    if ($key === 'rank_math_title' || $key === 'aigos_meta_title' || str_contains($key, 'title')) {
        return 'meta_title';
    }
    if ($key === 'rank_math_description' || $key === 'aigos_meta_description' || str_contains($key, 'description')) {
        return 'meta_description';
    }
    if ($key === 'faq_schema_jsonld' || str_contains($key, 'faq')) {
        return 'faq_schema';
    }
    if ($key === 'aigos_canonical' || str_contains($key, 'canonical')) {
        return 'canonical';
    }
    if ($key === 'aigos_open_graph' || str_contains($key, 'open_graph')) {
        return 'open_graph';
    }
    if ($key === 'aigos_llms_txt' || str_contains($key, 'llms')) {
        return 'llms_txt';
    }
    if ($key === 'aigos_robots_txt' || str_contains($key, 'robots')) {
        return 'robots_txt';
    }
    if ($key === 'aigos_sitemap_xml' || str_contains($key, 'sitemap')) {
        return 'sitemap_xml';
    }
    if ($type === 'option' && $key !== '') {
        return 'option:' . $key;
    }
    if ($type === 'post_meta' && $key !== '') {
        return 'post_meta:' . $key;
    }
    return 'unknown';
}

/**
 * @param array<string, mixed> $target
 * @return mixed
 */
function aigos_read_current_value(array $target)
{
    $type = isset($target['type']) ? (string) $target['type'] : '';
    $key = isset($target['key']) ? (string) $target['key'] : '';
    $post_id = isset($target['post_id']) ? (int) $target['post_id'] : 0;

    $slot = aigos_slot_for_target($target);
    $overrides = aigos_get_overrides();
    if (isset($overrides[$slot])) {
        return $overrides[$slot];
    }

    if ($type === 'post_meta' && $post_id > 0 && $key !== '') {
        $meta = get_post_meta($post_id, $key, true);
        return $meta === '' ? null : $meta;
    }

    if ($type === 'option' && $key !== '') {
        $opt = get_option($key, null);
        return $opt;
    }

    return null;
}

/**
 * @param array<string, mixed> $target
 * @param mixed $value
 */
function aigos_write_value(array $target, $value): void
{
    $type = isset($target['type']) ? (string) $target['type'] : '';
    $key = isset($target['key']) ? (string) $target['key'] : '';
    $post_id = isset($target['post_id']) ? (int) $target['post_id'] : 0;
    $slot = aigos_slot_for_target($target);

    $overrides = aigos_get_overrides();
    if ($value === null || $value === '') {
        unset($overrides[$slot]);
    } else {
        $overrides[$slot] = $value;
    }
    aigos_save_overrides($overrides);

    if ($type === 'post_meta' && $post_id > 0 && $key !== '') {
        if ($value === null || $value === '') {
            delete_post_meta($post_id, $key);
        } else {
            update_post_meta($post_id, $key, $value);
        }
        // Yoast / Rank Math aliases when using Rank Math keys on a post.
        if ($key === 'rank_math_title') {
            update_post_meta($post_id, '_yoast_wpseo_title', $value);
        }
        if ($key === 'rank_math_description') {
            update_post_meta($post_id, '_yoast_wpseo_metadesc', $value);
        }
        return;
    }

    if ($type === 'option' && $key !== '' && $key !== 'faq_schema_jsonld') {
        if ($value === null || $value === '') {
            delete_option($key);
        } else {
            update_option($key, $value, false);
        }
    }
}

function aigos_apply_patch(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    if (!is_array($body)) {
        return new WP_Error('aigos_invalid', 'JSON body required', ['status' => 400]);
    }

    $patch_id = isset($body['patch_id']) ? (string) $body['patch_id'] : '';
    $target = isset($body['target']) && is_array($body['target']) ? $body['target'] : null;
    $after = isset($body['after_state']) && is_array($body['after_state']) ? $body['after_state'] : null;

    if ($patch_id === '' || $target === null || $after === null || !array_key_exists('value', $after)) {
        return new WP_Error(
            'aigos_invalid',
            'patch_id, target, and after_state.value required',
            ['status' => 400]
        );
    }

    $slot = aigos_slot_for_target($target);
    if ($slot === 'unknown') {
        return new WP_Error('aigos_unsupported', 'Unsupported patch target', ['status' => 400]);
    }

    $before_value = aigos_read_current_value($target);
    $backups = aigos_get_backups();
    $backups[$patch_id] = [
        'target' => $target,
        'before_state' => ['value' => $before_value],
        'slot' => $slot,
        'saved_at' => gmdate('c'),
    ];
    aigos_save_backups($backups);

    aigos_write_value($target, $after['value']);

    // Ensure /llms.txt and /sitemap.xml rewrites are live after apply.
    if (in_array($slot, ['llms_txt', 'sitemap_xml', 'robots_txt'], true)) {
        aigos_register_rewrites();
        flush_rewrite_rules(false);
    }

    return rest_ensure_response([
        'ok' => true,
        'patch_id' => $patch_id,
        'slot' => $slot,
        'before_state' => ['value' => $before_value],
        'after_state' => ['value' => $after['value']],
    ]);
}

function aigos_rollback(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    if (!is_array($body)) {
        return new WP_Error('aigos_invalid', 'JSON body required', ['status' => 400]);
    }

    $patch_id = isset($body['patch_id']) ? (string) $body['patch_id'] : '';
    $target = isset($body['target']) && is_array($body['target']) ? $body['target'] : null;
    $before = isset($body['before_state']) && is_array($body['before_state']) ? $body['before_state'] : null;

    if ($patch_id === '' || $target === null || $before === null || !array_key_exists('value', $before)) {
        $backups = aigos_get_backups();
        if ($patch_id !== '' && isset($backups[$patch_id]) && is_array($backups[$patch_id])) {
            $stored = $backups[$patch_id];
            $target = is_array($stored['target'] ?? null) ? $stored['target'] : $target;
            $before = is_array($stored['before_state'] ?? null) ? $stored['before_state'] : $before;
        }
    }

    if ($patch_id === '' || $target === null || $before === null || !array_key_exists('value', $before)) {
        return new WP_Error(
            'aigos_invalid',
            'patch_id, target, and before_state.value required',
            ['status' => 400]
        );
    }

    aigos_write_value($target, $before['value']);

    $backups = aigos_get_backups();
    unset($backups[$patch_id]);
    aigos_save_backups($backups);

    return rest_ensure_response([
        'ok' => true,
        'patch_id' => $patch_id,
        'restored' => ['value' => $before['value']],
    ]);
}

// —— Front-end injection so verify can see applied SEO changes ——

add_filter('pre_get_document_title', function ($title) {
    $overrides = aigos_get_overrides();
    if (!empty($overrides['meta_title']) && is_string($overrides['meta_title'])) {
        return $overrides['meta_title'];
    }
    return $title;
}, 20);

add_filter('document_title_parts', function ($parts) {
    $overrides = aigos_get_overrides();
    if (!empty($overrides['meta_title']) && is_string($overrides['meta_title'])) {
        $parts['title'] = $overrides['meta_title'];
        $parts['site'] = '';
        $parts['tagline'] = '';
    }
    return $parts;
}, 20);

add_action('wp_head', function () {
    $overrides = aigos_get_overrides();
    if (!empty($overrides['meta_description']) && is_string($overrides['meta_description'])) {
        echo '<meta name="description" content="' . esc_attr($overrides['meta_description']) . "\" />\n";
    }
    if (!empty($overrides['canonical']) && is_string($overrides['canonical'])) {
        echo '<link rel="canonical" href="' . esc_url($overrides['canonical']) . "\" />\n";
    }
    if (!empty($overrides['open_graph']) && is_string($overrides['open_graph'])) {
        // Trusted internal draft (meta tags only).
        echo $overrides['open_graph'] . "\n";
    }
    if (!empty($overrides['faq_schema']) && is_string($overrides['faq_schema'])) {
        $json = $overrides['faq_schema'];
        // Ensure valid JSON string for script tag
        $decoded = json_decode($json, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            echo '<script type="application/ld+json">' . wp_json_encode($decoded) . "</script>\n";
        } else {
            echo '<script type="application/ld+json">' . $json . "</script>\n";
        }
    }
}, 1);

// Serve /llms.txt and /sitemap.xml from plugin options when present.
add_action('init', function () {
    aigos_register_rewrites();
});

add_filter('query_vars', function ($vars) {
    $vars[] = 'aigos_llms';
    $vars[] = 'aigos_sitemap';
    return $vars;
});

add_action('template_redirect', function () {
    $overrides = aigos_get_overrides();
    if ((int) get_query_var('aigos_llms') === 1 && !empty($overrides['llms_txt']) && is_string($overrides['llms_txt'])) {
        status_header(200);
        header('Content-Type: text/plain; charset=utf-8');
        echo $overrides['llms_txt'];
        exit;
    }
    if ((int) get_query_var('aigos_sitemap') === 1 && !empty($overrides['sitemap_xml']) && is_string($overrides['sitemap_xml'])) {
        status_header(200);
        header('Content-Type: application/xml; charset=utf-8');
        echo $overrides['sitemap_xml'];
        exit;
    }
});

add_filter('robots_txt', function ($output, $public) {
    $overrides = aigos_get_overrides();
    if (!empty($overrides['robots_txt']) && is_string($overrides['robots_txt'])) {
        return $overrides['robots_txt'];
    }
    return $output;
}, 20, 2);
