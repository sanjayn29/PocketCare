const fs = require('fs');
const path = require('path');

const specPath = path.join(
  process.cwd(),
  'node_modules',
  '@clerk',
  'expo',
  'src',
  'specs',
  'NativeClerkModule.ts'
);

function applyFix() {
  if (!fs.existsSync(specPath)) {
    console.log('[fix-clerk-codegen] Clerk spec file not found, skipping.');
    return;
  }

  const source = fs.readFileSync(specPath, 'utf8');
  const updated = source.replace(
    "TurboModuleRegistry.get<Spec>('ClerkExpo')",
    "TurboModuleRegistry.get<Spec>('NativeClerkModule')"
  );

  if (updated === source) {
    console.log('[fix-clerk-codegen] No change needed.');
    return;
  }

  fs.writeFileSync(specPath, updated, 'utf8');
  console.log('[fix-clerk-codegen] Applied Clerk NativeModule codegen fix.');
}

applyFix();
