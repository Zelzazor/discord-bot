const Discord = require("discord.js");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const ytdl = require('ytdl-core');
const yts = require("yt-search");


dotenv.config();

const queue = new Map();

let limit;

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
            queue.delete(guild.id);
            clearTimeout(limit);
            limit = setTimeout(()=>{ 
                if(queue.size < 1){
                    serverQueue.textChannel.send("He salido de la sala por inactividad...");
                    serverQueue.voiceChannel.leave();
                } 
            }, 600000)
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

    showQueue: async (message, serverQueue) => {
        if (!message.member.voice.channel)
        return message.channel.send(
            "¡Debes estar en un canal de música para ver la cola!"
        );
        if (!serverQueue)
            return message.channel.send("¡No hay canciones en la cola!");
        
        let songs = "```Cola actual:\n\n";
        let totalLength = 0;
        let index = 1;

        for (let song of serverQueue.songs){
            let metadata = await ytdl.getBasicInfo(song.url);
            let songLength = parseInt(metadata.videoDetails.lengthSeconds);
            let time = functions.secondsToString(songLength);
            songs += `${index}. ${song.title} - ${time} \n`;
            index++;
            totalLength += songLength;
        }

        let totalTime = functions.secondsToString(totalLength);
        
        songs += `Total time - ${totalTime}\`\`\``;

        

        return message.channel.send(songs);
    },

    removeSpecificSong: (message, serverQueue) => {
        let args = message.content.trim().split(/ +/g);
        if(args.length != 2){
            return message.channel.send("¡Cantidad de argumentos incorrecto! Uso: /remove <número> - Ejemplo: /remove 1")
        }
        if(args[1] < 1 || args[1] > serverQueue.songs.length){
            return message.channel.send("Índice inválido. Revise la cantidad de canciones presentes en la cola e intente con un índice de canción válido")
        }
        if(args[1] === '1'){
            functions.skipSong(message, serverQueue);
            return;
        }

        if (!message.member.voice.channel)
        return message.channel.send(
            "¡Debes estar en un canal de música para ver la cola!"
        );
        if (!serverQueue)
            return message.channel.send("¡No hay canciones en la cola!");

        let index = args[1];

        let indexedSong = serverQueue.songs[index-1];

        serverQueue.songs = serverQueue.songs.filter(( _ , i) => {
            return i !== index-1;
        });
        return message.channel.send(`Canción eliminada: ${indexedSong.title}`);
    },

    secondsToString: (seconds) => {
        let hour = Math.floor(seconds / 3600);
        hour = (hour < 1) ? '' : hour + ':';
        let minute = Math.floor((seconds / 60) % 60);
        minute = (minute < 10)? '0' + minute + ':' : minute + ':';
        let second = seconds % 60;
        second = (second < 10)? '0' + second : second;
        return hour + minute + second;
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
    //music bot
    "/play": functions.addSong,
    "/skip": functions.skipSong,
    "/stop": functions.stopSongs,
    "/queue": functions.showQueue,
    "/remove": functions.removeSpecificSong,
    "/p": functions.addSong,
    "/sk": functions.skipSong,
    "/st": functions.stopSongs,
    "/q": functions.showQueue,
    "/r": functions.removeSpecificSong
}

client.on("message", async (msg) => {
    if(msg.content.indexOf("/") !== 0) return;
    let args = msg.content.trim().split(/ +/g);
    //console.log(args);
    try{
        //music bot
        if(args[0] === '/play' || args[0] === '/skip' || args[0] === '/stop' || args[0] === '/queue' || args[0]=== '/remove' || args[0] === '/p' || args[0] === '/sk' || args[0] === '/st' || args[0] === '/q' || args[0]=== '/r'){
            const serverQueue = queue.get(msg.guild.id);
            await commands[args[0]](msg, serverQueue);
        }
        //other stuff
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