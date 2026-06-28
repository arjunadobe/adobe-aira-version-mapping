<?php
declare(strict_types=1);

namespace ${vendor}\${module}\Block\Widget;

use Magento\Framework\View\Element\Template;
use Magento\Widget\Block\BlockInterface;

class ${widgetName} extends Template implements BlockInterface
{
    protected $_template = '${vendor}_${module}::widget/${widgetName}.phtml';
}
