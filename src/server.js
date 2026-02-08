const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "money-garden" });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Money Garden server listening on ${port}`);
});


