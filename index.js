const http = require("http");
const fs = require("fs");
const path = require("path");

const indexPage = fs.readFileSync(path.resolve(__dirname, 'public/index.html'), 'utf8');
const loginPage = fs.readFileSync(path.resolve(__dirname, 'public/login.html'), 'utf8');
const notFoundPage = fs.readFileSync(path.resolve(__dirname, 'public/not-found.html'), 'utf8');

const port = 3000; // 변경 가능

let idCnt = 0;
let loggedInUsers = {};

const getCookieVal = (keyToFind, req) => {
    try {
        const cookieList = req.headers.cookie.split(';');
        let val = undefined;
        for (const cookieString of cookieList) {
            const key = cookieString.split('=')[0].replace(/\s/g, '');
            const value = cookieString.split('=')[1];
            // console.log(key, value);
            if (key === keyToFind) {
                val = value;
                break;
            }
        }
        return val;
    }
    catch (e) {
        console.log(e);
        return undefined;
    }
}

const getSessionData = (id) => {
    try {
        return loggedInUsers[id];
    } catch (e) {
        return undefined;
    }
}

const pages = {
    index: (req, res) => {
        // Check cookies
        const userID = getCookieVal('sparcs-wheel-sessionID', req);
        if (userID !== undefined) {
            const sessionData = getSessionData(userID);
            if (sessionData) {
                if (sessionData.loggedIn) {
                    res.setHeader("Content-Type", "text/html");
                    res.write(indexPage);
                    res.end();
                    return;
                }
            }
        }
        res.setHeader("Location", "/login"); res.statusCode = 301;
        res.end();
    },
    login: (req, res) => {
        // handle POST for login
        if (req.method === 'POST') {
            const userID = getCookieVal('sparcs-wheel-sessionID', req);
            if (userID !== undefined) {
                // If server is managing state, then just set loggedIn to false
                const sessionData = getSessionData(userID);
                if (sessionData) {
                    sessionData.loggedIn = true;
                    res.setHeader("Location", "/"); res.statusCode = 301;
                    res.end();
                    return;
                }
            }
            loggedInUsers[ idCnt.toString() ] = { loggedIn: true }
            res.setHeader("Set-Cookie", `sparcs-wheel-sessionID=${ idCnt++ }; Max-Age=2592000`);
            res.setHeader("Location", "/"); res.statusCode = 301;
            res.end();
        }
        else {
            res.setHeader("Content-Type", "text/html");
            res.write(loginPage);
            res.end();
        }
    },
    logout: (req, res) => {
        const userID = getCookieVal('sparcs-wheel-sessionID', req);
        if (userID !== undefined) {
            // If server is managing state, then just set loggedIn to false
            const sessionData = getSessionData(userID);
            if (sessionData) {
                sessionData.loggedIn = false;
            }
        }
        // res.setHeader("Set-Cookie", `sparcs-wheel-sessionID=loggedOut; Max-Age=-1`);
        res.setHeader("Location", "/login"); res.statusCode = 301;
        res.end();
    },
    notFound: (req, res) => {
        res.setHeader("Content-Type", "text/html");
        res.statusCode = 404;
        res.write(notFoundPage);
        res.end();
    }
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk; // 필요한 경우 body 사용
    });
    console.log("request arrvied");

    req.on("end", () => {
      // TODO
        console.log('[DEBUG: Req PATH]', req.url, req.httpVersion);
        if (req.httpVersion !== '1.1') {
            res.statusCode = 505;
            res.end();
            return;
        }
        // console.log(req.headers);
        // console.log(body);
        switch(req.url) {
            case '/':
                pages.index(req, res);
                break;
            case '/login':
                pages.login(req, res);
                break;
            case '/logout':
                pages.logout(req, res);
                break;
            default:
                pages.notFound(req, res);
                break;
        }

    });
  })
  .listen(port, () => {
    console.log("Server listening on " + port);
  });
