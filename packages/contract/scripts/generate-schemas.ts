#!/usr/bin/env bun
/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as TJS from 'typescript-json-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths
const projectRoot = join(__dirname, '..');
const tsconfigPath = join(projectRoot, 'tsconfig.json');
const outputDir = join(projectRoot, 'artifacts');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

// Create program from TypeScript files
// Using compiler options that match tsconfig.json
const compilerOptions: TJS.CompilerOptions = {
  lib: ['ESNext'],
  target: TJS.ts.ScriptTarget.ESNext,
  module: TJS.ts.ModuleKind.ESNext,
  moduleResolution: TJS.ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
};

const program = TJS.getProgramFromFiles(
  [
    join(projectRoot, 'src/methods/definitions/methods.ts'),
    join(projectRoot, 'src/events/definitions/events.ts'),
    join(projectRoot, 'src/methods/types/payload.ts'),
    join(projectRoot, 'src/utils.ts'),
  ],
  compilerOptions,
  tsconfigPath,
);

// Generate schema for Methods
const methodsSchema = TJS.generateSchema(program, 'Methods', {
  required: true,
  strictNullChecks: true,
  ignoreErrors: false,
  ref: false, // Disable refs to make schema self-contained
  aliasRef: false,
  topRef: false,
  titles: true,
  defaultProps: true,
  noExtraProps: false,
  propOrder: true,
  typeOfKeyword: false,
  validationKeywords: ['pattern', 'format'],
  include: [],
  excludePrivate: false,
  uniqueNames: false,
  rejectDateType: false,
});

// Generate schema for Events
const eventsSchema = TJS.generateSchema(program, 'Events', {
  required: true,
  strictNullChecks: true,
  ignoreErrors: false,
  ref: false, // Disable refs to make schema self-contained
  aliasRef: false,
  topRef: false,
  titles: true,
  defaultProps: true,
  noExtraProps: false,
  propOrder: true,
  typeOfKeyword: false,
  validationKeywords: ['pattern', 'format'],
  include: [],
  excludePrivate: false,
  uniqueNames: false,
  rejectDateType: false,
});

// Write schemas to files
if (methodsSchema) {
  // Add title to root schema
  if (!methodsSchema.title) {
    methodsSchema.title = 'Methods';
  }
  const methodsOutputPath = join(outputDir, 'methods.schema.json');
  writeFileSync(
    methodsOutputPath,
    JSON.stringify(methodsSchema, null, 2),
    'utf-8',
  );
  console.log(`✓ Generated schema for Methods: ${methodsOutputPath}`);
} else {
  console.error('✗ Failed to generate schema for Methods');
  process.exit(1);
}

if (eventsSchema) {
  // Add title to root schema
  if (!eventsSchema.title) {
    eventsSchema.title = 'Events';
  }
  const eventsOutputPath = join(outputDir, 'events.schema.json');
  writeFileSync(
    eventsOutputPath,
    JSON.stringify(eventsSchema, null, 2),
    'utf-8',
  );
  console.log(`✓ Generated schema for Events: ${eventsOutputPath}`);
} else {
  console.error('✗ Failed to generate schema for Events');
  process.exit(1);
}

console.log('\n✓ All schemas generated successfully!');
