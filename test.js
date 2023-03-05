app.get("/query", async (req, res) => {
  // console.log(req.body?.question);
  // const question = req.body.question;
  async function apiQuery(question) {
    const configuration = new Configuration({
      apiKey: "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",
    });
    const openai = new OpenAIApi(configuration);
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: "Say this is a test",
      temperature: 0,
      max_tokens: 7,
    });
    // const configuration = new Configuration({
    //   apiKey: "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",
    // process.env.OPENAI_API_KEY,
    // });
    // const openai = new OpenAIApi(configuration);

    // const completion = await openai.createCompletion(
    //   {
    //     model: "gpt-3.5-turbo",
    //     messages: [{ role: "user", content: "question" }],
    //   }
    // {
    //   proxy: false,
    //   httpAgent: tunnel.httpOverHttp({
    //     proxy: {
    //       host: "127.0.0.1",
    //       port: 7890,
    //     },
    //   }),
    // }

    return completion;
    // .data.choices[0].text;
  }
  //

  //

  const fetchData = async (inputText) => {
    const agent = new HttpsProxyAgent("http://127.0.0.1:7890");
    try {
      const response = await axios.post(
        // process.env.CHAT_API_URL,
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "inputText" }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          // httpsAgent: agent,
        }
      );
      console.log(response);
    } catch (err) {
      console.log(err.message);
    }

    // .catch((err) => {
    //   console.log(err.message);
    // });
    // console.log(response);
    return response.data;
    // .data.choices[0].message.content.trim();
  };

  //
  // const question = req.query.question;
  // console.log(question);
  try {
    const answer = await fetchData("question");
    res.send(answer);
  } catch (e) {
    console.log(e);
    res.send({ Error: e.message });
  }
});
