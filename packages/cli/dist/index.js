#!/usr/bin/env node
import { Command } from 'commander';
import { exportCommand } from './commands/export.js';
import { validateCommand } from './commands/validate.js';
const program = new Command();
program
    .name('vmp')
    .description('Vegan Meal Prep CLI - Convert Cooklang recipes to importable JSON')
    .version('0.1.0');
program.addCommand(exportCommand);
program.addCommand(validateCommand);
program.parse();
//# sourceMappingURL=index.js.map