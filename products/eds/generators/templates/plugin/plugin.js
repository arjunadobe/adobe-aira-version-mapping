/*
 * ${pluginName} — EDS plugin. A default-export hook invoked from scripts.js.
 * Keep work off the critical path (lazy phase) unless it must run eagerly.
 */
export default function ${pluginName}(options = {}) {
  // plugin logic — e.g. instrument links, decorate sections, wire experimentation.
  return { name: '${pluginName}' };
}
