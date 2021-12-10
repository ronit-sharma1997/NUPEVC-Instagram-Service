const express = require("express");
const app = express();

const Instagram = require("instagram-web-api");
const FileCookieStore = require("tough-cookie-filestore2");
const fs = require("fs");
const imaps = require("imap-simple");
const _ = require("lodash");
const simpleParser = require("mailparser").simpleParser;
const cron = require("node-cron");
const memjs = require('memjs');

const memCacheClient = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
    username: process.env.MEMCACHEDCLOUD_USERNAME,
    password: process.env.MEMCACHEDCLOUD_PASSWORD
  });

require("dotenv").config();

const port = process.env.PORT || 4000;

cron.schedule("0 0 */3 * *", async () => {
  const instagramLoginFunction = async () => {
    // Persist cookies after Instagram client log in
    const cookieStore = new FileCookieStore("./cookies.json");

    const client = new Instagram(
      {
        username: process.env.INSTAGRAM_USERNAME,
        password: process.env.INSTAGRAM_PASSWORD,
        cookieStore,
      },
      {
        language: "en-US",
        proxy: process.env.NODE_ENV === "production" ? process.env.FIXIE_URL : undefined
      }
    );

    const instagramGetPicturesFunction = async () => {
      await client
        .getPhotosByUsername({ username: process.env.INSTAGRAM_USERNAME })
        .then((res) => {
            console.log(`${new Date()} : Setting Instagram Data In Memory for the Day`)
            memCacheClient.set("instagramData", JSON.stringify(res));
        }
        )
    };

    try {
      console.log(`${new Date()} : Logging in...`);

      await client.login();

      console.log(`${new Date()} : Login successful!`);

      await instagramGetPicturesFunction()
    } catch (err) {
      console.log(`${new Date()} : Login failed!`);
    }
  };

instagramLoginFunction();
});


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin",
        "http://localhost:4200");
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

app.get('/instagram', function (req, res) {
    console.log(`${new Date()} : Getting Instagram Data`)
    memCacheClient.get("instagramData", function (err, value, key) {
        const parsedValue = JSON.parse(value.toString());

        if (parsedValue != null) {
            const data = parsedValue.user?.edge_owner_to_timeline_media.edges.map(
                (item) => ({imgUrl: item.node.display_url, videoUrl: item.node.video_url || null, is_video: item.node.is_video, caption: item.node.edge_media_to_caption.edges[0].node.text, shortcode: item.node.shortcode, likes: item.node.edge_media_preview_like.count, views: item.node.video_view_count || null, comments: item.node.edge_media_to_comment.count})
              )
            res.send(data || [])
        } else {
            res.send([])
        }
    });
    
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

