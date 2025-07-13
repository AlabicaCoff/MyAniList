import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import mongoose from "mongoose"

const app = express();
const port = 3000;
const API_URL = "https://api.jikan.moe/v4";
const Mongo_URL = "mongodb://rootuser:rootpass@mongodb:27017/mydatabase?authSource=admin";

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

const MyAnimeSchema = new mongoose.Schema({
    mal_id: {
        type: Number,
        require: true
    },
    image: {
        type: String,
    },
    title: {
        type: String,
        required: true,
    },
    episodes: {
        type: Number,
    },
    day: {
        type: String,
    },
    time: {
        type: String,
    },
    broadcast: {
        type: String,
    }
});

const MyAnimeModel = mongoose.model('Anime', MyAnimeSchema);

const dayWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

app.get("/", async (req, res) => {
    var day = new Date().getDay();
    const result = await axios.get(API_URL + "/schedules?filter=" + dayWeek[day]);
    const data = await Promise.all(result.data.data.map(async (anime) => {
        const exists = await MyAnimeModel.exists({ mal_id: anime.mal_id });
        return {
            ...anime,
            isAdded: exists
        };
    }));
    const myAnimes = await MyAnimeModel.find({day: dayWeek[day]});
    res.render("index.ejs", { animes: data, day: dayWeek[day], myAnimes: myAnimes });
});

app.get("/schedules/:day", async (req, res) => {
    var day = req.params.day;
    const result = await axios.get(API_URL + "/schedules?filter=" + day);
    const data = await Promise.all(result.data.data.map(async (anime) => {
        const exists = await MyAnimeModel.exists({ mal_id: anime.mal_id });
        return {
            ...anime,
            isAdded: exists
        };
    }));
    const myAnimes = await MyAnimeModel.find({ day: day })
    res.render("index.ejs", { animes: data, day: day, myAnimes: myAnimes });
});

app.post("/search", async (req, res) => {
    var query = req.body.query;
    const result = await axios.get(API_URL + "/anime?q=" + query + "&status=airing&sfw");
    const data = await Promise.all(result.data.data.map(async (anime) => {
        const exists = await MyAnimeModel.exists({ mal_id: anime.mal_id });
        return {
            ...anime,
            isAdded: exists
        };
    }));
    res.render("search.ejs", { query: query, animes: data});
});

app.get("/myschedules", async (req, res) => {
    const myAnimes = await MyAnimeModel.find()
    res.render("myschedules.ejs", { animes: myAnimes });
});

app.get("/add_anime/:id", async (req, res) => {
    var animeId = req.params.id;
    const result = await axios.get(API_URL + "/anime/" + animeId);
    const data = result.data.data
    try { 
        const anime = new MyAnimeModel({
            mal_id: data.mal_id,
            image: data.images.jpg.image_url,
            title: data.title,
            episodes: data.episodes,
            day: data.broadcast.day.slice(0, -1).toLowerCase(),
            time: data.broadcast.time,
            broadcast: data.broadcast.string
        })
    await anime.save();

    if (anime.day) {
        res.redirect("/schedules/" + anime.day);
    }
    else {
        res.redirect("/myschedules");
    }
    } catch (err) {
        console.log(err)
    }
});

app.get("/remove_anime/:id", async (req, res) => {
    var animeId = req.params.id;
    await MyAnimeModel.findByIdAndDelete(animeId)
    res.redirect("/myschedules");
});

app.listen(port, () => {
    mongoose.connect(Mongo_URL);
    console.log(`Server is running on port ${port}`);
});