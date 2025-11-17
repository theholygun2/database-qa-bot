import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;


app.use(cors());


app.get("/", (req, res) => {
    res.send("Server is running!");
})

app.get("/ping", (req, res) => {
    res.json({ message: "pong from backend"});
    console.log("Pong from backend")
})

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost: `, PORT);
});