const OpenAI = require("openai-api");
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { mean } = require("d3-array");

module.exports = async (prompt) => {
  const averageNarrativeLength = mean(
    prompt
      .split("\n")
      .filter((i) => i.startsWith("narrative:"))
      .map((i) => i.replace("narrative:", ""))
      .map((i) => i.length)
      .filter((i) => i > 1)
  );

  const gptResponse = await openai.complete({
    engine: "gpt-3.5-turbo-instruct",
    prompt,
    maxTokens: 280,
    temperature: 0.8,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    bestOf: 3,
    n: 3,
    stream: false,
    stop: ["\n"],
  });

  // pick the completion which has the closest length
  const answers = gptResponse.data.choices.map((c) => c.text);
  answers.sort(
    (a, b) =>
      Math.abs(averageNarrativeLength - a.length) -
      Math.abs(averageNarrativeLength - b.length)
  );
  return answers[0];
};