<?php
declare(strict_types=1);

namespace ${vendor}\${module}\Model\Indexer;

use Magento\Framework\Indexer\ActionInterface;
use Magento\Framework\Mview\ActionInterface as MviewActionInterface;

class ${indexerName} implements ActionInterface, MviewActionInterface
{
    public function executeFull(): void
    {
        // rebuild the whole index
    }

    public function executeList(array $ids): void
    {
        // reindex the given ids
    }

    public function executeRow($id): void
    {
        // reindex a single id
    }

    public function execute($ids): void
    {
        $this->executeList((array) $ids);
    }
}
