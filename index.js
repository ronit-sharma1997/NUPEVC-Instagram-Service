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

cron.schedule("54 17 * * *", async () => {
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

    //   const delayedLoginFunction = async (timeout) => {
    //     setTimeout(async () => {
    //       await client.login().then(() => instagramGetPicturesFunction());
    //     }, timeout);
    //   };

    //   if (err.statusCode === 403 || err.statusCode === 429) {
    //     console.log(`${new Date()} : Throttled!`);

    //     await delayedLoginFunction(60000);
    //   }

    //   console.log(err);

    //   // Instagram has thrown a checkpoint error
    //   if (err.error && err.error.message === "checkpoint_required") {
    //     const challengeUrl = err.error.checkpoint_url;

    //     await client.updateChallenge({ challengeUrl, choice: 1 });

    //     const emailConfig = {
    //       imap: {
    //         user: `${process.env.EMAIL}`,
    //         password: `${process.env.PASSWORD}`,
    //         host: "imap.gmail.com",
    //         port: 993,
    //         tls: true,
    //         tlsOptions: {
    //           servername: "imap.gmail.com",
    //           rejectUnauthorized: false,
    //         },
    //         authTimeout: 30000,
    //       },
    //     };

    //     // Connect to email and solve Instagram challenge after delay
    //     const delayedEmailFunction = async (timeout) => {
    //       setTimeout(() => {
    //         imaps.connect(emailConfig).then(async (connection) => {
    //           return connection.openBox("INBOX").then(async () => {
    //             // Fetch emails from the last hour
    //             const delay = 1 * 3600 * 1000;
    //             let lastHour = new Date();
    //             lastHour.setTime(Date.now() - delay);
    //             lastHour = lastHour.toISOString();
    //             const searchCriteria = ["ALL", ["SINCE", lastHour]];
    //             const fetchOptions = {
    //               bodies: [""],
    //             };
    //             return connection
    //               .search(searchCriteria, fetchOptions)
    //               .then((messages) => {
    //                 messages.forEach((item) => {
    //                   const all = _.find(item.parts, { which: "" });
    //                   const id = item.attributes.uid;
    //                   const idHeader = "Imap-Id: " + id + "\r\n";
    //                   simpleParser(idHeader + all.body, async (err, mail) => {
    //                     if (err) {
    //                       console.log(err);
    //                     }

    //                     console.log(mail.subject);

    //                     const answerCodeArr = mail.text
    //                       .split("\n")
    //                       .filter(
    //                         (item) =>
    //                           item && /^\S+$/.test(item) && !isNaN(Number(item))
    //                       );

    //                     if (mail.text.includes("Instagram")) {
    //                       if (answerCodeArr.length > 0) {
    //                         // Answer code must be kept as string type and not manipulated to a number type to preserve leading zeros
    //                         const answerCode = answerCodeArr[0];
    //                         console.log(answerCode);

    //                         await client.updateChallenge({
    //                           challengeUrl,
    //                           securityCode: answerCode,
    //                         });

    //                         console.log(
    //                             `${new Date()} : Answered Instagram security challenge with answer code: ${answerCode}`
    //                         );

    //                         await client.login();

    //                         await instagramGetPicturesFunction();
    //                       }
    //                     }
    //                   });
    //                 });
    //               });
    //           });
    //         });
    //       }, timeout);
    //     };

    //     await delayedEmailFunction(40000);
    //   }

    //   // Delete stored cookies, if any, and log in again
    //   console.log(`${new Date()} : Logging in again and setting new cookie store`);
    //   fs.unlinkSync("./cookies.json");
    //   const newCookieStore = new FileCookieStore("./cookies.json");

    //   const newClient = new Instagram(
    //     {
    //       username: process.env.INSTAGRAM_USERNAME,
    //       password: process.env.INSTAGRAM_PASSWORD,
    //       cookieStore: newCookieStore,
    //     },
    //     {
    //       language: "en-US",
    //     }
    //   );

    //   const delayedNewLoginFunction = async (timeout) => {
    //     setTimeout(async () => {
    //       console.log(`${new Date()} : Logging in again`);
    //       await newClient
    //         .login()
    //         .then(() => instagramGetPicturesFunction())
    //         .catch((err) => {
    //           console.log(err);
    //           console.log(`${new Date()} : Login failed again!`);
    //         });
    //     }, timeout);
    //   };

    //   await delayedNewLoginFunction(10000);
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
        if (value != null) {
            const data = value.user?.edge_owner_to_timeline_media.edges.map(
                (item) => ({imgUrl: item.node.display_url, videoUrl: item.node.video_url || null, is_video: item.node.is_video, caption: item.node.edge_media_to_caption.edges[0].node.text, shortcode: item.node.shortcode, likes: item.node.edge_media_preview_like.count, views: item.node.video_view_count || null, comments: item.node.edge_media_to_comment.count})
              )
            res.send(data)
        } else {
            res.send([])
        }
    });
    
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

