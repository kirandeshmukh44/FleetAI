// Parse each page with Vite's own transform pipeline to surface exact errors.
// Usage: node check-pages.mjs
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const dir = join(process.cwd(), 'src', 'pages');
const files = readdirSync(dir).filter((name) => name.endsWith('.jsx'));

const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true } });
const transform = (await server.environments.client.transformRequest.bind(server.environments.client));

let failures = 0;
for (const name of files) {
  try {
    await transform(join(dir, name));
    console.log(`OK  ${name}`);
  } catch (error) {
    failures += 1;
    const message = String(error.message || error)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(' | ');
    console.log(`BAD ${name}: ${message}`);
  }
}

await server.close();
console.log(`\n${files.length - failures}/${files.length} pages parse cleanly`);
process.exit(failures ? 1 : 0);


