export {};

declare global {
  /**
   * A manifest for embedded templates, where the key is the file path and
   * the value is the base64 encoded content. This is injected at build time
   * by tsdown using the `embed-templates` plugin. The templates are bundled
   * in the `src/templates` directory and can be accessed at runtime via this manifest.
   */
  var SCRIPT_ACTION_TEMPLATE_MANIFEST: Record<string, string> | undefined;
}
