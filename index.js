const express = require("express");
const app = express();
const memjs = require('memjs');

const memCacheClient = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
    username: process.env.MEMCACHEDCLOUD_USERNAME,
    password: process.env.MEMCACHEDCLOUD_PASSWORD
  });

require("dotenv").config();

const port = process.env.PORT || 4000;

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin",
        "https://www.nupevc.com");
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
          let data = parsedValue?.edge_owner_to_timeline_media?.edges.map(
            (item) => ({imgUrl: encodeURIComponent(item.node.display_url), videoUrl: item.node.video_url ? encodeURIComponent(item.node.video_url) : null, is_video: item.node.is_video, caption: item.node.edge_media_to_caption.edges[0].node.text, shortcode: item.node.shortcode, likes: item.node.edge_media_preview_like.count, views: item.node.video_view_count || null, comments: item.node.edge_media_to_comment.count})
          )
          data = {posts: data, postCount: parsedValue?.edge_owner_to_timeline_media?.count, 
                        username : parsedValue?.username, 
                        title: parsedValue?.full_name, 
                        biography: parsedValue?.biography,
                        url: parsedValue?.external_url,
                        followersCount: parsedValue?.edge_followed_by?.count,
                        followingCount: parsedValue?.edge_follow?.count }
          res.send(data || [])
        } else {
            res.send([])
        }
    });
    
    
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

