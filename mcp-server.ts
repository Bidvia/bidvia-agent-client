import {
  runLocalMcpServerMain,
  shouldRunLocalMcpServerMain,
} from './src/mcp-server.js';

export * from './src/mcp-server.js';

if (shouldRunLocalMcpServerMain(process.argv[1], import.meta.url)) {
  runLocalMcpServerMain();
}
