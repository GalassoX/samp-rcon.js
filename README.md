# samp-rcon.js
Rcon Client for SA:MP servers

> npm install samp-rcon.js


## **API**

* SampClient

  <details>
  <summary>properties</summary>
  <p>

    * ip: string = { get; set; };
    * password: string = { get; set; };
    * port: number = { get; set; };

  </p>
  </details>

### **SampClient(ip: string, port: number)**
Constuctor

### **.executeCommand(command: string)**
Execute Rcon command to the server

`Returns: Promise<string>`

### **.getInfo()**
Get the server info

`Returns: Promise<Object>`
```js
{
    passworded: boolean;
    players: number;
    maxplayers: number;
    hostname: string;
    gamemode: string;
    mapname: string;
}
```

### **.getUsers()**
Get all users connected

`Returns: Promise<Object[]>`
```js
{
    id: number;
    name: string;
    score: number;
    ping: number;
}[]
```
### **.getServerRules()**
Get server rules (the gravity, weather, the website URL...)

`Return: Promise<Object>`
```js
{
    [Server rules that you defined]: value
}
```