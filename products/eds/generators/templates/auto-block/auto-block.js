/*
 * Auto-block for the "${blockName}" block — builds it from page content automatically.
 * Wire it into buildAutoBlocks(main) in scripts/scripts.js:
 *   import buildAutoBlock from './auto-blocks/${blockName}.js';
 *   buildAutoBlock(main);
 */
import { buildBlock } from '../scripts.js';

export default function buildAutoBlock(main) {
  // Example: wrap the first section into a `${blockName}` block when a condition holds.
  const section = main.querySelector(':scope > div');
  if (!section) return;
  const block = buildBlock('${blockName}', { elems: [...section.children] });
  section.prepend(block);
}
