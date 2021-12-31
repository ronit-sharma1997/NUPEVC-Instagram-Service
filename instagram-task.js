const Instagram = require("instagram-web-api");
const FileCookieStore = require("tough-cookie-filestore2");
const memjs = require('memjs');

const memCacheClient = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
    username: process.env.MEMCACHEDCLOUD_USERNAME,
    password: process.env.MEMCACHEDCLOUD_PASSWORD
  });

require("dotenv").config();

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

    const instagramGetUser = async () => {
      await client.getUserByUsername({username: process.env.INSTAGRAM_USERNAME}).then((res) => {
        console.log(`${new Date()} : Setting Instagram Profile In Memory for the Day`)
        memCacheClient.set("instagramData", JSON.stringify(res));
      })
    }

    try {
      console.log(`${new Date()} : Logging in...`);

      await client.login();

      console.log(`${new Date()} : Login successful!`);

      await instagramGetUser()
    } catch (err) {
      console.log(`${new Date()} : ${err.message}`);
    }
};

instagramLoginFunction();