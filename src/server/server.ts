import express from 'express';
import path from 'path';

const app = express();

app.use('/static', express.static(path.join(__dirname, '../src', 'public')));
app.get('/', (req, res)=>{
	res.sendFile(path.join(__dirname, "../src", "webpage", "tbc.html"));
});

app.listen('4488', () =>{
	console.log(`
  		################################################
  		🛡️  Server listening on port: 4488  🛡️
  		################################################
	`);
});