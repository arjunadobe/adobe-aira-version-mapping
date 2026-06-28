<?php
declare(strict_types=1);

namespace ${vendor}\${module}\Console\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class ${commandName} extends Command
{
    protected function configure(): void
    {
        $this->setName('${cliName}')->setDescription('${commandName}');
        parent::configure();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('<info>${cliName} ran</info>');
        return Command::SUCCESS;
    }
}
