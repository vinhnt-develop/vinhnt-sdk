---
title: "Custom Tools"
description: "Build tools for external APIs"
lang: "en"
type: "example"
category: "Examples"
sidebarPosition: 2
---

# Custom Tools

Building tools that call external APIs like weather services and GitHub.

## Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant M as AI Model
    participant W as Weather API

    U->>A: "Weather in Hanoi?"
    A->>M: Prompt + get_weather tool
    M->>A: Call get_weather(city: "Hanoi")
    A->>W: GET /weather?q=Hanoi
    W->>A: { temp: 28, condition: "sunny" }
    A->>M: Tool result
    M->>A: "Hanoi is 28°C and sunny"
    A->>U: "Hanoi is 28°C and sunny"
```

## weather-tool.ts

```typescript
import { defineTool } from "@vinhnt-sdk/tools";

const WEATHER_API = "https://api.openweathermap.org/data/2.5";

export const getWeatherTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a city. Returns temperature, condition, and humidity.",
  risk: "external",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name, e.g. 'Hanoi' or 'Tokyo'" },
      units: { type: "string", enum: ["metric", "imperial"], default: "metric" },
    },
    required: ["city"],
  },
  execute: async (params) => {
    const response = await fetch(
      `${WEATHER_API}/weather?q=${encodeURIComponent(params.city)}&units=${params.units}&appid=${process.env.WEATHER_API_KEY}`
    );

    if (!response.ok) {
      return { error: `City not found: ${params.city}` };
    }

    const data = await response.json();

    return {
      city: data.name,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      condition: data.weather[0].main,
      description: data.weather[0].description,
    };
  },
});

export const forecastTool = defineTool({
  name: "get_forecast",
  description: "Get 5-day weather forecast for a city.",
  risk: "external",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
    },
    required: ["city"],
  },
  execute: async (params) => {
    const response = await fetch(
      `${WEATHER_API}/forecast?q=${encodeURIComponent(params.city)}&appid=${process.env.WEATHER_API_KEY}`
    );

    const data = await response.json();

    return {
      city: data.city.name,
      forecast: data.list.slice(0, 5).map((item: any) => ({
        time: item.dt_txt,
        temp: item.main.temp,
        condition: item.weather[0].main,
      })),
    };
  },
});
```

## github-tool.ts

```typescript
import { defineTool } from "@vinhnt-sdk/tools";

export const githubSearchTool = defineTool({
  name: "github_search",
  description: "Search GitHub repositories by keyword and language.",
  risk: "external",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      language: { type: "string", description: "Filter by programming language" },
      limit: { type: "number", description: "Max results to return", default: 5 },
    },
    required: ["query"],
  },
  execute: async (params) => {
    const langFilter = params.language ? `+language:${params.language}` : "";
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(params.query)}${langFilter}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const data = await response.json();

    return {
      total: data.total_count,
      repos: data.items.slice(0, params.limit).map((repo: any) => ({
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        url: repo.html_url,
      })),
    };
  },
});
```

## Usage & Tool Composition

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { defineTool } from "@vinhnt-sdk/tools";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { getWeatherTool, forecastTool } from "./weather-tool";
import { githubSearchTool } from "./github-tool";

const model = {
  id: "openai-gpt4o",
  provider: "openai",
  model: "gpt-4o",
  capabilities: { streaming: true, toolCalling: true, vision: false },
  async *stream(request: any) {
    // Implement with your preferred AI SDK
  },
};

const kernel = new AgentKernel({
  model,
  tools: [getWeatherTool, forecastTool, githubSearchTool],
  store: new NullRunEventStore(),
});

// A tool that calls other tools via context
const tripPlannerTool = defineTool({
  name: "plan_trip",
  description: "Plan a trip by checking weather.",
  risk: "external",
  parameters: {
    type: "object",
    properties: {
      destination: { type: "string", description: "Destination city" },
      date: { type: "string", description: "Travel date (YYYY-MM-DD)" },
    },
    required: ["destination", "date"],
  },
  execute: async (params, context) => {
    const weatherResult = await context.executeTool("get_weather", {
      city: params.destination,
    });
    return {
      destination: params.destination,
      date: params.date,
      weather: weatherResult,
      recommendation: weatherResult.temperature > 20
        ? "Great weather for travel!"
        : "Consider packing warm clothes.",
    };
  },
});

const weather = await kernel.run("What's the weather in Hanoi?");
const repos = await kernel.run("Find popular Rust projects for web servers");
```

## Key Concepts

- **Risk `"external"`** — Use for tools that make HTTP requests to third-party APIs.
- **Error handling** — Always check `response.ok` and return structured error objects.
- **Auth via env vars** — Store API keys in environment variables, never in code.
- **`context.executeTool`** — Call other tools from within a tool for composition.
