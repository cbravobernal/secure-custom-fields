import {
  getBlockBindingsSource,
  registerBlockBindingsSource,
  unregisterBlockBindingsSource,
} from "@wordpress/blocks";
import domReady from "@wordpress/dom-ready";

/*
 * Re-register the core/post-meta source to disable editing of custom fields.
 * Code needs to run in `domReady` because it is when core sources are registered in the editor.
 * See: https://github.com/WordPress/wordpress-develop/blob/trunk/src/wp-admin/site-editor.php#L209-L211.
 */
domReady(function () {
  const originalPostMetaSource = getBlockBindingsSource("core/post-meta");
  unregisterBlockBindingsSource("core/post-meta");
  registerBlockBindingsSource({
    name: "core/post-meta",
    ...originalPostMetaSource,
    canUserEditValue: () => false,
    getValues: ({ select, context, bindings }) => {
      const meta = select("core/editor").getEditedPostAttribute("meta") || {};
      const key = bindings?.content?.args?.key;
      const value = meta[key];

      // If meta is undefined or value is undefined, return the key as the value
      if (value === undefined) {
        return { content: key };
      }

      // Return unformatted value
      return { content: value };
    },
  });
});
