import express from 'express';
import path from 'path';
const app = express();
app.use(express.static('public'));
app.listen(3000);
