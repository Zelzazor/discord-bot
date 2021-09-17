const Discord = require("discord.js");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const ytdl = require('ytdl-core');
const yts = require("yt-search");


dotenv.config();

const queue = new Map();

// eslint-disable-next-line no-undef
const scp_auth = process.env.KEY_SCP;

const client = new Discord.Client()

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

const functions = {
    advice: async () => {
        const URL = encodeURI(`https://api.adviceslip.com/advice`);
        const res = await fetch(URL);
        //console.log(res);
        const data = await res.json();
        
        return data.slip.advice;
    },
    find_scp: async (search) => {
        const URL = encodeURI(`https://scp-api-zelzazor.herokuapp.com/scp/${search}`);
        const init = {
            method: 'GET',
            headers: {
                'Authorization': 'Basic: ' + scp_auth
            }
        }
        const res = await fetch(URL, init);
        //console.log(res);
        const data = await res.json();
        

        const title = data[0].item_number;
        const scp_name = data[0].name;
        const scp_class = data[0].object_class;
        const description = data[0].description;
        const link = encodeURI(data[0].link);
        
        return `\n**${title}** - ${scp_name}\n\nObject class: **${scp_class}**\n\nDescription: ${description}\n\nMore information: ${link}`
    },
    random_scp: async () => {
        const URL = encodeURI(`https://scp-api-zelzazor.herokuapp.com/scp/random`);
        const init = {
            method: 'GET',
            headers: {
                'Authorization': 'Basic: ' + scp_auth
            }
        }
        const res = await fetch(URL, init);
        //console.log(res);
        const data = await res.json();
        //console.log(data);

        const title = data[0].item_number;
        const scp_name = data[0].name;
        const scp_class = data[0].object_class;
        const description = data[0].description;
        const link = encodeURI(data[0].link);

        return `\n**${title}** - ${scp_name}\n\nObject class: **${scp_class}**\n\nDescription: ${description}\n\nMore information: ${link}`
    },
    addSong: async (message, serverQueue) => {
        let args = message.content.trim().split(/ +/g);
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel)
          return message.channel.send(
            "¡Necesitas estar en un canal de voz para escuchar música! "+args[0]
          );
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
          return message.channel.send(
            "¡No tengo permisos! Dile al administrador que me dé permisos."
          );
        }
        else {
            let song;
            if (ytdl.validateURL(args[1])) {
                const metadata = await ytdl.getInfo(args[1]);
                const songInfo = metadata.player_response.videoDetails;
                song = {
                  title: songInfo.title,
                  url: `https://youtube.com/watch?v=${songInfo.videoId}`
                };
                
                
            } 
            else {
                const {videos} = await yts(args.slice(1).join(" "));
                if (!videos.length) return message.channel.send("¡No se han encontrado canciones!");
                song = {
                  title: videos[0].title,
                  url: videos[0].url
                };
                
            }

            if (!serverQueue) {
                const queueContruct = {
                  textChannel: message.channel,
                  voiceChannel: voiceChannel,
                  connection: null,
                  songs: [],
                  volume: 5,
                  playing: true
                }
                queue.set(message.guild.id, queueContruct);

                queueContruct.songs.push(song);

                try {
                    let connection = await voiceChannel.join();
                    queueContruct.connection = connection;
                    functions.playSong(message.guild, queueContruct.songs[0]);
                } catch (err) {
                    console.log(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(err);
                }
            }
            else {
                serverQueue.songs.push(song);
                return message.channel.send(`¡${song.title} Ha sido añadida a la cola!`);
            }

        }
    },
    playSong: (guild, song) => {
        const serverQueue = queue.get(guild.id);
        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on("finish", () => {
                serverQueue.songs.shift();
                functions.playSong(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Comenzando canción: **${song.title}**`);
    },

    skipSong: (message, serverQueue) => {
        if (!message.member.voice.channel)
            return message.channel.send(
                "¡Debes estar en un canal de música para saltar una canción!"
            );
        if (!serverQueue)
            return message.channel.send("¡No hay canciones en la cola para saltar!");
        serverQueue.connection.dispatcher.end();
    },

    stopSongs: (message, serverQueue) => {
        if (!message.member.voice.channel)
            return message.channel.send(
                "¡Debes estar en un canal de música para detener las canciones!"
            );
    
        if (!serverQueue)
            return message.channel.send("¡No hay canciones en la cola qué detener!");
    
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
}

const commands = {
    "/ping": () => "pong",
    "/toque": () => `\n🚨 Toque de queda a partir de 2/6/2021 hasta 9/6/2021 🚨:
    \nLunes a Viernes: 6:00P.M. con libre tránsito hasta las 9:00P.M.
    \nFin de semana: 3:00P.M. con libre tránsito hasta las 6:00P.M.
    \n🚨 Toque de queda a partir de 27/5/2021 (Solo aplica al GSD) 🚨:
    \nTodos los días: 8:00P.M. con libre tránsito hasta las 11:00P.M.
    \n🚨 Toque de queda anterior 🚨:
    \nLunes a viernes: 10:00P.M. con libre tránsito hasta las 12:00A.M.
    \nFin de semana: 9:00P.M. con libre tránsito hasta las 12:00A.M.\n`,
    "/random_scp": functions.random_scp,
    "/scp": functions.find_scp,
    "/advice": functions.advice,
    "/play": functions.addSong,
    "/skip": functions.skipSong,
    "/stop": functions.stopSongs
}

client.on("message", async (msg) => {
    if(msg.content.indexOf("/") !== 0) return;
    let args = msg.content.trim().split(/ +/g);
    //console.log(args);
    try{
        if(args[0] === '/play' || args[0] === '/skip' || args[0] === '/stop'){
            const serverQueue = queue.get(msg.guild.id);
            await commands[args[0]](msg, serverQueue);
             
            
            
            await msg.reply('Aquí estará el futuro bot de música. Comando utilizado: '+ args[0]);
        }
        else{
            if(args.length > 1){
                await msg.reply(await commands[args[0]](args[1]));
            }else{
                await msg.reply(await commands[args[0]]());
            }
        }
        
        
    }
    catch(err){
        console.log(err);
    }
})



// eslint-disable-next-line no-undef
client.login(process.env.TOKEN);