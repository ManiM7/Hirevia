const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');

(async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`[server] Hirevia API listening on port ${port}`);
  });
})();

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
