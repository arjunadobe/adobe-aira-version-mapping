/**
 * ${blockName} block — decorate() runs on the block element at render time.
 * EDS calls the default export with the block's root element.
 */
export default function decorate(block) {
  // Each direct child row of `block` is a row in the authored table.
  [...block.children].forEach((row) => {
    row.classList.add('${blockName}-row');
  });
}
