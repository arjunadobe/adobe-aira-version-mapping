/* ${blockName} — EDS block backed by the @dropins/${dropin} drop-in (Commerce SaaS). */
import { initializers } from '@dropins/tools/initializer.js';
import { render as provider } from '@dropins/${dropin}/render.js';

export default async function decorate(block) {
  block.classList.add('${blockName}');
  // Mount the drop-in. Import the specific container from @dropins/${dropin}
  // (see the boilerplate-commerce docs) and render it into `block`.
  await initializers.mountImmediately(provider, {});
}
