const Discord = require("discord.js");
const dotenv = require("dotenv");
const fetch = require("node-fetch");


dotenv.config();

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
        

        const title = data.title;
        const scp_name = data.name;
        const scp_class = data.class;
        const description = data.description;
        const link = encodeURI(data.link);
        
        return `**${title}** - ${scp_name}\n\nObject class: **${scp_class}**\n\nDescription: ${description}\n\nMore information: ${link}`
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

        const title = data.title;
        const scp_name = data.name;
        const scp_class = data.class;
        const description = data.description;
        const link = encodeURI(data.link);

        return `**${title}** - ${scp_name}\n\nObject class: **${scp_class}**\n\nDescription: ${description}\n\nMore information: ${link}`
    }
}

const commands = {
    "/ping": () => "pong",
    "/toque": () => `🚨 Toque de queda a partir de 2/6/2021 hasta 9/6/2021 🚨:
    \nLunes a Viernes: 6:00P.M. con libre tránsito hasta las 9:00P.M.
    \nFin de semana: 3:00P.M. con libre tránsito hasta las 6:00P.M.
    \n🚨 Toque de queda a partir de 27/5/2021 (Solo aplica al GSD) 🚨:
    \nTodos los días: 8:00P.M. con libre tránsito hasta las 11:00P.M.
    \n🚨 Toque de queda anterior 🚨:
    \nLunes a viernes: 10:00P.M. con libre tránsito hasta las 12:00A.M.
    \nFin de semana: 9:00P.M. con libre tránsito hasta las 12:00A.M.\n`,
    "/random_scp": functions.random_scp,
    "/scp": functions.find_scp,
    "/advice": functions.advice
}

client.on("message", async (msg) => {
    if(msg.content.indexOf("/") !== 0) return;
    let args = msg.content.trim().split(/ +/g);
    //console.log(args);
    try{
        if(args.length > 1){
            await msg.reply(await commands[args[0]](args[1]));
        }else{
            await msg.reply(await commands[args[0]]());
        }
        
    }
    catch(err){
        console.log(err);
    }
})

// eslint-disable-next-line no-undef
client.login(process.env.TOKEN);