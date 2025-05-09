const express = require("express");
const axios = require("axios");

let accessToken = null;
let tokenExpiry = null;

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;

const numberAPIs = {
  p: "http://20.244.56.144/evaluation-service/primes",
  f: "http://20.244.56.144/evaluation-service/fibo",
  e: "http://20.244.56.144/evaluation-service/even",
  r: "http://20.244.56.144/evaluation-service/rand",
};

const AUTH_URL = "http://20.244.56.144/evaluation-service/auth";

const AUTH_PAYLOAD = {
  email: "piyush.2226cs1032@kiet.edu",
  name: "piyush varshney",
  rollNo: "2200290120119",
  accessCode: "SxVeja",
  clientID: "9d2d64a6-b4c3-45c5-8b23-0ffb6b33d9d8",
  clientSecret: "DbrwbKwNAtTJACrH",
};

let numberWindow = [];

async function getAccessToken() {
  const now = new Date().getTime();
  if (accessToken && tokenExpiry && now < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await axios.post(AUTH_URL, AUTH_PAYLOAD);

    accessToken = response.data.access_token;
    tokenExpiry = response.data.expires_in * 1000;

    // console.log("Access Token ", accessToken);
    return accessToken;
  } catch (err) {
    console.error("Token fetch error:", err.message);
    throw new Error("Failed to authenticate");
  }
}

app.get("/numbers/:numberid", async (req, res) => {
  const numberId = req.params.numberid;

  if (!numberAPIs[numberId]) {
    return res.status(400).json({ error: "Invalid number ID" });
  }

  const prevWindow = [...numberWindow];
  let fetchedNumbers = [];

  try {
    const source = axios.CancelToken.source();
    const timeout = setTimeout(() => {
      source.cancel("Request timed out");
    }, 500);

    const token = await getAccessToken();

    const response = await axios.get(numberAPIs[numberId], {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 500,
      cancelToken: source.token,
    });

    clearTimeout(timeout);

    if (response.data && response.data.numbers) {
      fetchedNumbers = response.data.numbers;
    }
  } catch (error) {
    return res.status(200).json({
      windowPrevState: prevWindow,
      windowCurrState: numberWindow,
      numbers: [],
      avg: average(numberWindow),
    });
  }

  for (const num of fetchedNumbers) {
    if (!numberWindow.includes(num)) {
      numberWindow.push(num);
      if (numberWindow.length > WINDOW_SIZE) {
        numberWindow.shift();
      }
    }
  }

  return res.status(200).send({
    windowPrevState: JSON.stringify(prevWindow),
    windowCurrState: JSON.stringify(numberWindow),
    numbers: JSON.stringify(fetchedNumbers),
    avg: average(numberWindow),
  });
});

function average(arr) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return parseFloat((sum / arr.length).toFixed(2));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
