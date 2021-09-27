const Discord = require("discord.js");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const yts = require("yt-search");

dotenv.config();

const queue = new Map();

let limit;

const minutesBeforeTimeout = 3;

// eslint-disable-next-line no-undef
const scp_auth = process.env.KEY_SCP;

const client = new Discord.Client();

// eslint-disable-next-line no-undef
const COOKIE = process.env.COOKIE;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const functions = {
  advice: async () => {
    const URL = encodeURI(`https://api.adviceslip.com/advice`);
    const res = await fetch(URL);
    //console.log(res);
    const data = await res.json();

    return data.slip.advice;
  },
  find_scp: async (search) => {
    const URL = encodeURI(
      `https://scp-api-zelzazor.herokuapp.com/scp/${search}`
    );
    const init = {
      method: "GET",
      headers: {
        Authorization: "Basic: " + scp_auth,
      },
    };
    const res = await fetch(URL, init);
    //console.log(res);
    const data = await res.json();

    const title = data[0].item_number;
    const scp_name = data[0].name;
    const scp_class = data[0].object_class;
    const description = data[0].description;
    const link = encodeURI(data[0].link);

    return `\n**${title}** - ${scp_name}\n\nObject class: **${scp_class}**\n\nDescription: ${description}\n\nMore information: ${link}`;
  },
  random_scp: async () => {
    const URL = encodeURI(`https://scp-api-zelzazor.herokuapp.com/scp/random`);
    const init = {
      method: "GET",
      headers: {
        Authorization: "Basic: " + scp_auth,
      },
    };
    const res = await fetch(URL, init);
    //console.log(res);
    const data = await res.json();
    //console.log(data);

    const title = data[0].item_number;
    const scp_name = data[0].name;
    const scp_class = data[0].object_class;
    const description = data[0].description;
    const link = encodeURI(data[0].link);

    return `\n**${title}** - ${scp_name}\n\nObject class: **${scp_class}**\n\nDescription: ${description}\n\nMore information: ${link}`;
  },
  addSong: async (message, serverQueue) => {
    let args = message.content.trim().split(/ +/g);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send(
        "¡Necesitas estar en un canal de voz para escuchar música! " + args[0]
      );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        "¡No tengo permisos! Dile al administrador que me dé permisos."
      );
    } else {
      let song;
      if (ytdl.validateURL(args[1])) {
        const metadata = await ytdl.getInfo(args[1]);
        const songInfo = metadata.player_response.videoDetails;
        song = {
          title: songInfo.title,
          url: `https://youtube.com/watch?v=${songInfo.videoId}`,
          length: songInfo.lengthSeconds,
        };
      } else {
        const { videos } = await yts(args.slice(1).join(" "));
        if (!videos.length) {
          console.log("¡No se han encontrado canciones!");
          return message.channel.send("¡No se han encontrado canciones!");
        }
        song = {
          title: videos[0].title,
          url: videos[0].url,
          length: videos[0].seconds,
        };
      }

      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
        };

        queueContruct.songs.push(song);
        queue.set(message.guild.id, queueContruct);

        try {
          let connection = await voiceChannel.join();
          queueContruct.connection = connection;
          functions.playSong(message.guild, queueContruct.songs[0]);
        } catch (err) {
          console.log(err);
          queue.delete(message.guild.id);
          return message.channel.send(err);
        }
      } else {
        serverQueue.songs.push(song);
        console.log(`¡${song.title} Ha sido añadida a la cola!`);
        return message.channel.send(
          `¡${song.title} Ha sido añadida a la cola!`
        );
      }
    }
  },

  addPlaylist: async (message, serverQueue) => {
    let args = message.content.trim().split(/ +/g);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      console.log("¡Necesitas estar en un canal de voz para escuchar música!");
      return message.channel.send(
        "¡Necesitas estar en un canal de voz para escuchar música! " + args[0]
      );
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      console.log(
        "¡No tengo permisos! Dile al administrador que me dé permisos."
      );
      return message.channel.send(
        "¡No tengo permisos! Dile al administrador que me dé permisos."
      );
    } else {
      const songs = [];
      let metadata;
      if (ytpl.validateID(args[1])) {
        metadata = await ytpl(args[1]);
        const songsMeta = metadata.items;

        songsMeta.forEach((song) => {
          const songFormat = {
            title: song.title,
            url: song.shortUrl,
            length: song.durationSec,
          };
          songs.push(songFormat);
        });
      } else {
        console.log(
          "Enlace de playlist inválido. Revise el enlace e intente de nuevo."
        );
        return message.channel.send(
          "Enlace de playlist inválido. Revise el enlace e intente de nuevo."
        );
      }

      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true,
        };
        queue.set(message.guild.id, queueContruct);

        songs.forEach((song) => {
          queueContruct.songs.push(song);
        });

        try {
          let connection = await voiceChannel.join();
          queueContruct.connection = connection;
          functions.playSong(message.guild, queueContruct.songs[0]);
          console.log(
            `¡La playlist ${metadata.title} Ha sido añadida a la cola!`
          );
          return message.channel.send(
            `¡La playlist ${metadata.title} Ha sido añadida a la cola!`
          );
        } catch (err) {
          console.log(err);
          queue.delete(message.guild.id);
          return message.channel.send(err);
        }
      } else {
        songs.forEach((song) => {
          serverQueue.songs.push(song);
        });
        console.log(
          `¡La playlist ${metadata.title} Ha sido añadida a la cola!`
        );

        return message.channel.send(
          `¡La playlist ${metadata.title} Ha sido añadida a la cola!`
        );
      }
    }
  },
  playSong: (guild, song) => {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      queue.delete(guild.id);
      clearTimeout(limit);
      console.log("Timeout comenzado.");
      limit = setTimeout(() => {
        if (queue.size < 1) {
          console.log("El bot ha dejado el chat de voz.");
          serverQueue.textChannel.send(
            "He salido de la sala por inactividad..."
          );
          serverQueue.voiceChannel.leave();
        }
      }, minutesBeforeTimeout * 60000);
      return;
    }

    const stream = ytdl(song.url, {
      quality: "highestaudio",
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          Cookie: COOKIE
        }
      }
    });
    const dispatcher = serverQueue.connection.play(stream).on("finish", () => {
      serverQueue.songs.shift();
      functions.playSong(guild, serverQueue.songs[0]);
    });

    const listenerError = stream.listeners("error")[0];
    stream.removeListener("error", listenerError);

    stream.on("error", (error) => {
      try {
        throw new Error();
      } catch {
        stream.destroy();
        console.log(
          "Ha ocurrido un error inesperado con la canción que se intentó reproducir."
        );
        serverQueue.textChannel.send(
          "Ha ocurrido un error inesperado con la canción que se intentó reproducir."
        );
        console.log(error);
      }
    });

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    console.log(`Comenzando canción: ${song.title}`);
    serverQueue.textChannel.send(`Comenzando canción: **${song.title}**`);
  },

  showQueue: async (message, serverQueue) => {
    if (!message.member.voice.channel) {
      console.log("¡Debes estar en un canal de música para ver la cola!");
      return message.channel.send(
        "¡Debes estar en un canal de música para ver la cola!"
      );
    }

    if (!serverQueue) {
      console.log("¡No hay canciones en la cola!");
      return message.channel.send("¡No hay canciones en la cola!");
    }

    let songs = "```Cola actual:\n\n";
    let totalLength = 0;
    let queueSongs = [...serverQueue.songs];
    let messages = Math.ceil(queueSongs.length / 25);

    let index = 1;

    if (messages < 2) {
      for (let song of queueSongs) {
        let time = functions.secondsToString(song.length);
        if (index === 1) {
          songs += `Ahora está sonando: \n\n`;
          songs += `${index}. ${song.title} - ${time} \n\n`;
          songs += queueSongs.length === 1 ? `` : `En la cola: \n\n`;
        } else {
          songs += `${index}. ${song.title} - ${time} \n`;
        }

        index++;
        totalLength += song.length;
      }

      let totalTime = functions.secondsToString(totalLength);

      songs += `\n\n${serverQueue.songs.length} canci${
        serverQueue.songs.length === 1 ? "ón" : "ones"
      } en la cola - Tiempo total - ${totalTime}\`\`\``;
      console.log("Mostrada Cola de Reproducción");
      return message.channel.send(songs.slice(0, 1999));
    } else {
      let dividedQueue = [];
      let initial = 0;
      let final = 25;
      for (let i = 0; i < messages; i++) {
        if (i === messages - 1) {
          final = initial + (queueSongs.length - initial);
          dividedQueue.push(queueSongs.slice(initial, final));
        } else {
          dividedQueue.push(queueSongs.slice(initial, final));
          initial = final;
          final = initial + 25;
        }
      }

      let indexQueue = 0;

      for (let queue of dividedQueue) {
        songs = "```Cola actual:\n\n";
        for (let song of queue) {
          let time = functions.secondsToString(song.length);
          if (index == 1) {
            songs += `Ahora está sonando: \n\n`;
            songs += `${index}. ${song.title} - ${time} \n\n`;
            songs += queueSongs.length === 1 ? `` : `En la cola: \n\n`;
          } else {
            songs += `${index}. ${song.title} - ${time} \n`;
          }

          index++;
          totalLength += song.length;
        }
        let totalTime = functions.secondsToString(totalLength);
        if (indexQueue === dividedQueue.length - 1) {
          songs += `\n\n${serverQueue.songs.length} canci${
            serverQueue.songs.length === 1 ? "ón" : "ones"
          } en la cola - Tiempo total - ${totalTime}\`\`\``;
        } else {
          songs += `\n\n\`\`\``;
        }

        console.log("Mostrada Cola de Reproducción");
        await message.channel.send(songs.slice(0, 1999));
        indexQueue++;
      }

      //console.log(dividedQueue);
    }

    //if(index > 25) songs+=`\n\nLímite de vista de cola (25) alcanzado\n`;
  },

  removeSpecificSong: (message, serverQueue) => {
    let args = message.content.trim().split(/ +/g);
    if (args.length != 2) {
      console.log(
        "¡Cantidad de argumentos incorrecto! Uso: /remove <número> - Ejemplo: /remove 1"
      );
      return message.channel.send(
        "¡Cantidad de argumentos incorrecto! Uso: /remove <número> - Ejemplo: /remove 1"
      );
    }
    if (args[1] < 1 || args[1] > serverQueue.songs.length) {
      console.log(
        "/remove Índice inválido. Revise la cantidad de canciones presentes en la cola e intente con un índice de canción válido"
      );
      return message.channel.send(
        "Índice inválido. Revise la cantidad de canciones presentes en la cola e intente con un índice de canción válido"
      );
    }
    if (args[1] === "1") {
      functions.skipSong(message, serverQueue);
      return;
    }

    if (!message.member.voice.channel) {
      console.log("¡Debes estar en un canal de música para ver la cola!");
      return message.channel.send(
        "¡Debes estar en un canal de música para ver la cola!"
      );
    }

    if (!serverQueue) {
      console.log("¡No hay canciones en la cola!");
      return message.channel.send("¡No hay canciones en la cola!");
    }

    let index = args[1];

    let indexedSong = serverQueue.songs[index - 1];

    serverQueue.songs = serverQueue.songs.filter((_, i) => {
      return i !== index - 1;
    });
    console.log(`Canción eliminada: ${indexedSong.title}`);
    return message.channel.send(`Canción eliminada: ${indexedSong.title}`);
  },

  secondsToString: (seconds) => {
    let hour = Math.floor(seconds / 3600);
    hour = hour < 1 ? "" : hour + ":";
    let minute = Math.floor((seconds / 60) % 60);
    minute = minute < 10 ? "0" + minute + ":" : minute + ":";
    let second = seconds % 60;
    second = second < 10 ? "0" + second : second;
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
    console.log("¡Saltada canción!");
    return message.channel.send("¡Saltada canción!");
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
    console.log("¡Cola borrada y detenidas canciones!");
    return message.channel.send("¡Cola borrada y detenidas canciones!");
  },
};

const commands = {
  "/ping": () => "pong",
  "/toque": () => `\nOlvídese que ya no hay donde importa.\n`,
  "/random_scp": functions.random_scp,
  "/scp": functions.find_scp,
  "/advice": functions.advice,
  //music bot
  "/play": functions.addSong,
  "/playlist": functions.addPlaylist,
  "/skip": functions.skipSong,
  "/stop": functions.stopSongs,
  "/queue": functions.showQueue,
  "/remove": functions.removeSpecificSong,
  "/p": functions.addSong,
  "/pl": functions.addPlaylist,
  "/sk": functions.skipSong,
  "/st": functions.stopSongs,
  "/q": functions.showQueue,
  "/r": functions.removeSpecificSong,
};

client.on("message", async (msg) => {
  if (msg.content.indexOf("/") !== 0) return;
  let args = msg.content.trim().split(/ +/g);
  //console.log(args);
  try {
    //music bot
    if (
      args[0] === "/play" ||
      args[0] === "/skip" ||
      args[0] === "/stop" ||
      args[0] === "/queue" ||
      args[0] === "/remove" ||
      args[0] === "/playlist" ||
      args[0] === "/p" ||
      args[0] === "/sk" ||
      args[0] === "/st" ||
      args[0] === "/q" ||
      args[0] === "/r" ||
      args[0] === "/pl"
    ) {
      const serverQueue = queue.get(msg.guild.id);
      await commands[args[0]](msg, serverQueue);
    }
    //other stuff
    else {
      if (args.length > 1) {
        await msg.reply(await commands[args[0]](args[1]));
      } else {
        await msg.reply(await commands[args[0]]());
      }
    }
  } catch (err) {
    console.log(err);
  }
});

// eslint-disable-next-line no-undef
client.login(process.env.TOKEN);
