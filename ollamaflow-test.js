import http from "k6/http";
import { sleep, check } from "k6";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { SharedArray } from "k6/data";

const inputs = new SharedArray("inputs", function () {
  return JSON.parse(open("./data/inputs.json"));
});

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "40s",
      duration: "40m",
      preAllocatedVUs: 60,
      maxVUs: 60,
      gracefulStop: '30m'
    },
  },
};

let counter = 0;

function insertIntoTemplate(input) {
  return `Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
Extract issues from the user review in JSON format. For each issue, provide: label, functionality, severity (1-5), likelihood (1-5), category (Bug, User Experience, Performance, Security, Compatibility, Functionality, UI, Connectivity, Localization, Accessibility, Data Handling, Privacy, Notifications, Account Management, Payment, Content Quality, Support, Updates, Syncing, Customization), and the sentence.

### Input:
${input}

### Response:
`;
}

export default function () {
  const url = "http://localhost:3000/ollama/generate";

  const inputIndex = counter % inputs.length;
  const input = inputs[inputIndex];
  counter++;

  const payload = JSON.stringify({
    prompt: insertIntoTemplate(input),
    model: "irisk",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: "60m",
  };

  const res = http.post(url, payload, params);

  check(res, {
    "is ok": (r) => r.status === 200,
    "is done": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.done === true;
      } catch (e) {
        return false;
      }
    },
  });
}

export function handleSummary(data) {
  return {
    "summary.html": htmlReport(data),
    "summary.json": JSON.stringify(data, null, 2),
  };
}
