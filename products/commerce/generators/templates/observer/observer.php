<?php
declare(strict_types=1);

namespace ${vendor}\${module}\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;

class ${observerName} implements ObserverInterface
{
    public function execute(Observer $observer): void
    {
        // $event = $observer->getEvent(); handle ${event}
    }
}
