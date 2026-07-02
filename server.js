import express from 'express';
const app = express();
app.use(express.json());
app.post('/api/split', (req, res) => {
  res.json({ message: "Split outline" });
});
app.listen(3000);
