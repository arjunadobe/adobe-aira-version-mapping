<?php
declare(strict_types=1);

namespace ${vendor}\${module}\Controller\${controller};

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\ResultFactory;

class ${action} implements HttpGetActionInterface
{
    public function __construct(private readonly ResultFactory $resultFactory)
    {
    }

    public function execute()
    {
        return $this->resultFactory->create(ResultFactory::TYPE_PAGE);
    }
}
