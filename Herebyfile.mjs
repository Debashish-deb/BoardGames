import { task, logger } from "hereby";

function registerTask(name, description, run) {
  return task({
    name,
    description,
    async run() {
      const start = Date.now();
      logger.info(`[Hereby] ${name} starting`);
      await run?.();
      const duration = Date.now() - start;
      logger.info(`[Hereby] ${name} completed in ${duration}ms`);
    }
  });
}

registerTask("local", "Build the React Native client", async () => {
  // TODO: Integrate Expo/Turbo build here.
});

registerTask("tests", "Run unit/integration tests", async () => {
  // TODO: wire Jest/Playwright suites.
});

registerTask("clean", "Clean generated artifacts", async () => {
  // TODO: remove build outputs.
});

registerTask("lint", "Run linting", async () => {
  // TODO: hook eslint/dprint.
});

registerTask("knip", "Static dependency pruning", async () => {
  // TODO: integrate knip when ready.
});
