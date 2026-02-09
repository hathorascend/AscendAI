const express = require('express');
const billingRoutes = require('./routes/billing');

const app = express();

app.use((req, res, next) => {
  if (req.originalUrl === '/billing/webhook') {
    return next();
  }
  return express.json()(req, res, next);
});

app.use('/billing', billingRoutes);

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${port}`);
});
