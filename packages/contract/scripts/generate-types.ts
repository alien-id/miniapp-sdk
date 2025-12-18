/**
 * Generate types from contract using quicktype.
 * Usage: bun run scripts/generate-types.ts [lang] [output-path]
 * Example: bun run scripts/generate-types.ts dart dist/contract.dart
 *
 * If lang is not provided, an interactive prompt will ask for it.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { input, select } from '@inquirer/prompts';
import { spawn } from 'bun';
import { contract } from '../src/contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contractDir = join(__dirname, '..');

// Read version from package.json
const packageJsonPath = join(contractDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

// Supported languages for quicktype
const supportedLanguages = [
  { name: 'Dart', value: 'dart' },
  { name: 'Swift', value: 'swift' },
  { name: 'Kotlin', value: 'kotlin' },
  { name: 'TypeScript', value: 'typescript' },
  { name: 'Python', value: 'python' },
  { name: 'Go', value: 'go' },
  { name: 'Rust', value: 'rust' },
  { name: 'Java', value: 'java' },
  { name: 'C#', value: 'csharp' },
  { name: 'C++', value: 'cpp' },
];

// Parse CLI arguments or use interactive prompts
let lang = process.argv[2];
let outputPath = process.argv[3];

if (!lang) {
  lang = await select({
    message: 'Select target language:',
    choices: supportedLanguages,
  });
}

if (!outputPath) {
  const defaultPath = join(contractDir, 'dist', `contract.${lang}`);
  outputPath = await input({
    message: 'Output path:',
    default: defaultPath,
  });
}

// Ensure output directory exists
const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// TypeBox schemas are JSON Schema compatible - serialize to plain JSON
const jsonSchema = JSON.parse(
  JSON.stringify({
    $schema: 'https://json-schema.org/schema#',
    type: 'object',
    properties: {
      version: {
        type: 'string',
        description: 'Contract version',
        const: `"v${version}"`,
      },
      events: {
        type: 'object',
        properties: contract.events,
        required: Object.keys(contract.events),
      },
      methods: {
        type: 'object',
        properties: contract.methods,
        required: Object.keys(contract.methods),
      },
    },
    required: ['version', 'events', 'methods'],
  }),
);
// const jsonSchema = JSON.parse(contract);

// Write JSON schema to temporary file
const schemaPath = join(contractDir, '.contract-schema.json');
writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2));

// Generate types using quicktype
const quicktypeProcess = spawn(
  [
    'bunx',
    'quicktype',
    '--src-lang',
    'schema',
    '--lang',
    lang,
    '--src',
    schemaPath,
    '--out',
    outputPath,
  ],
  {
    stdout: 'inherit',
    stderr: 'inherit',
  },
);

const exitCode = await quicktypeProcess.exited;

// Clean up temporary schema file
try {
  unlinkSync(schemaPath);
} catch {
  // Ignore cleanup errors
}

if (exitCode === 0) {
  console.log(`✅ Generated ${lang} types: ${outputPath}`);
} else {
  console.error(`❌ Failed to generate ${lang} types`);
  process.exit(1);
}
